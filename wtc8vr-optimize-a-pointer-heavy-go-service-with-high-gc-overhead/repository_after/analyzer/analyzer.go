package analyzer

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/rand"
	"runtime"
	"sort"
	"strconv"
	"sync"
	"time"
)

type LargeRecord struct {
	ID         string
	Data       []byte
	MetaKey    string
	MetaValue  string
	Related    []int
	Tags       []string
	History    []string
	Hash       [32]byte
	Encoded    string
	Attributes []Attr
}

// Attr is a flat (non-map) representation of record attributes.
// Keeping this as a value slice avoids per-record map allocations and reduces GC scan pressure.
type Attr struct {
	A string
	B string
}

type HeavyService struct {
	mu          sync.Mutex
	cache       []LargeRecord
	indexByID   map[string]int
	indexByKey  map[string][]int
	eventLog    []string
	snapshots   [][]byte
	lastReports []string

	bgStop chan struct{}
	bgDone chan struct{}
	r      *rand.Rand

	idBuf    []byte
	keyBuf   []byte
	tagBuf   []byte
	eventBuf []byte

	// Pools to reuse record-owned backing arrays and avoid steady-state heap churn.
	// We only return objects to pools once records are evicted from the cache.
	dataPool    sync.Pool // []byte
	tagsPool    sync.Pool // []string
	historyPool sync.Pool // []string
	relatedPool sync.Pool // []int
	attrsPool   sync.Pool // []Attr
}

func NewHeavyService() *HeavyService {
	s := &HeavyService{
		cache:       make([]LargeRecord, 0, 10000),
		indexByID:   make(map[string]int, 10000),
		indexByKey:  make(map[string][]int, 50),
		eventLog:    make([]string, 0, 20000),
		snapshots:   make([][]byte, 0, 200),
		lastReports: make([]string, 0, 2000),
		bgStop:      make(chan struct{}),
		bgDone:      make(chan struct{}),
		r:           rand.New(rand.NewSource(time.Now().UnixNano())),
		idBuf:       make([]byte, 0, 64),
		keyBuf:      make([]byte, 0, 16),
		tagBuf:      make([]byte, 0, 32),
		eventBuf:    make([]byte, 0, 128),
	}
	s.dataPool.New = func() any { return make([]byte, 0, 1024) }
	s.tagsPool.New = func() any { return make([]string, 0, 10) }
	s.historyPool.New = func() any { return make([]string, 0, 5) }
	s.relatedPool.New = func() any { return make([]int, 0, 16) }
	s.attrsPool.New = func() any { return make([]Attr, 0, 3) }
	go s.backgroundMaintenance()
	return s
}

func (s *HeavyService) Close() {
	close(s.bgStop)
	<-s.bgDone
}

// appendInt appends integer to buffer without allocations
func appendInt(buf []byte, n int) []byte {
	return strconv.AppendInt(buf, int64(n), 10)
}

// appendInt64 appends int64 to buffer without allocations
func appendInt64(buf []byte, n int64) []byte {
	return strconv.AppendInt(buf, n, 10)
}

func (s *HeavyService) getData1024() []byte {
	b := s.dataPool.Get().([]byte)
	if cap(b) < 1024 {
		return make([]byte, 1024)
	}
	return b[:1024]
}

func (s *HeavyService) putData1024(b []byte) {
	if b == nil {
		return
	}
	if cap(b) < 1024 {
		return
	}
	// No need to zero: []byte has no pointers, so it doesn't retain heap references.
	s.dataPool.Put(b[:0])
}

func (s *HeavyService) getTags10() []string {
	x := s.tagsPool.Get().([]string)
	if cap(x) < 10 {
		x = make([]string, 0, 10)
	}
	return x[:10]
}

func (s *HeavyService) putTags10(x []string) {
	if x == nil {
		return
	}
	if cap(x) < 10 {
		return
	}
	x = x[:cap(x)]
	// Clear the full backing array to avoid retaining string references in the pool.
	for i := range x {
		x[i] = ""
	}
	// Keep this pool "tight" to avoid accidentally caching very large arrays.
	if cap(x) != 10 {
		return
	}
	s.tagsPool.Put(x[:0])
}

func (s *HeavyService) getHistory5() []string {
	x := s.historyPool.Get().([]string)
	if cap(x) < 5 {
		x = make([]string, 0, 5)
	}
	return x[:5]
}

func (s *HeavyService) putHistory5(x []string) {
	if x == nil {
		return
	}
	if cap(x) < 5 {
		return
	}
	x = x[:cap(x)]
	// Clear the full backing array to avoid retaining string references in the pool.
	for i := range x {
		x[i] = ""
	}
	// Keep this pool "tight" to avoid accidentally caching very large arrays.
	if cap(x) != 5 {
		return
	}
	s.historyPool.Put(x[:0])
}

func (s *HeavyService) getRelated(capacity int) []int {
	x := s.relatedPool.Get().([]int)
	if cap(x) < capacity {
		return make([]int, 0, capacity)
	}
	return x[:0]
}

func (s *HeavyService) putRelated(x []int) {
	if x == nil {
		return
	}
	s.relatedPool.Put(x[:0])
}

func (s *HeavyService) getAttrs3() []Attr {
	x := s.attrsPool.Get().([]Attr)
	if cap(x) < 3 {
		x = make([]Attr, 0, 3)
	}
	return x[:3]
}

func (s *HeavyService) putAttrs3(x []Attr) {
	if x == nil {
		return
	}
	if cap(x) < 3 {
		return
	}
	x = x[:cap(x)]
	// Clear the full backing array to avoid retaining string references in the pool.
	for i := range x {
		x[i] = Attr{}
	}
	// Keep this pool "tight" to avoid accidentally caching very large arrays.
	if cap(x) != 3 {
		return
	}
	s.attrsPool.Put(x[:0])
}

func (s *HeavyService) recycleRecord(rec *LargeRecord) {
	if rec == nil {
		return
	}
	s.putData1024(rec.Data)
	s.putTags10(rec.Tags)
	s.putHistory5(rec.History)
	s.putRelated(rec.Related)
	s.putAttrs3(rec.Attributes)
	*rec = LargeRecord{}
}

func (s *HeavyService) Ingest(count int) {
	for i := 0; i < count; i++ {
		s.mu.Lock()

		// Build ID using buffer reuse instead of strings.Join
		s.idBuf = s.idBuf[:0]
		s.idBuf = append(s.idBuf, "id-"...)
		s.idBuf = appendInt(s.idBuf, i)
		s.idBuf = append(s.idBuf, '-')
		s.idBuf = appendInt64(s.idBuf, time.Now().UnixNano())
		id := string(s.idBuf)

		// Single allocation for data, no redundant copies
		data := s.getData1024()
		for j := 0; j < len(data); j++ {
			data[j] = byte(s.r.Intn(256))
		}

		// Build key using buffer reuse
		s.keyBuf = s.keyBuf[:0]
		s.keyBuf = append(s.keyBuf, "key-"...)
		s.keyBuf = appendInt(s.keyBuf, s.r.Intn(50))
		key := string(s.keyBuf)

		// Tags as value slice, reused from pool
		tags := s.getTags10()
		for t := 0; t < 10; t++ {
			s.tagBuf = s.tagBuf[:0]
			s.tagBuf = append(s.tagBuf, "tag-"...)
			s.tagBuf = appendInt(s.tagBuf, t)
			s.tagBuf = append(s.tagBuf, '-')
			s.tagBuf = appendInt(s.tagBuf, s.r.Intn(99999))
			tags[t] = string(s.tagBuf)
		}

		// History as value slice, reused from pool
		history := s.getHistory5()
		for k := 0; k < 5; k++ {
			s.idBuf = s.idBuf[:0]
			s.idBuf = append(s.idBuf, "created:"...)
			s.idBuf = append(s.idBuf, id...)
			s.idBuf = append(s.idBuf, ':')
			s.idBuf = appendInt(s.idBuf, k)
			history[k] = string(s.idBuf)
		}

		// Hash as fixed-size array, no pointer indirection
		sum := sha256.Sum256(data)
		// Encoded directly from hash array
		encoded := base64.StdEncoding.EncodeToString(sum[:])

		// Attributes as a flat value slice, reused from pool (no per-record map allocations)
		attrs := s.getAttrs3()
		for a := 0; a < 3; a++ {
			s.tagBuf = s.tagBuf[:0]
			s.tagBuf = append(s.tagBuf, "v-"...)
			s.tagBuf = appendInt(s.tagBuf, a)
			s.tagBuf = append(s.tagBuf, '-')
			s.tagBuf = appendInt(s.tagBuf, s.r.Intn(100000))
			attrs[a].A = string(s.tagBuf)

			s.tagBuf = s.tagBuf[:0]
			s.tagBuf = append(s.tagBuf, "w-"...)
			s.tagBuf = appendInt(s.tagBuf, a)
			s.tagBuf = append(s.tagBuf, '-')
			s.tagBuf = appendInt(s.tagBuf, s.r.Intn(100000))
			attrs[a].B = string(s.tagBuf)
		}

		record := LargeRecord{
			ID:         id,
			Data:       data,
			MetaKey:    key,
			MetaValue:  id,
			Tags:       tags,
			History:    history,
			Hash:       sum,
			Encoded:    encoded,
			Attributes: attrs,
		}

		// Related records as indices instead of pointers
		relCount := 5 + s.r.Intn(10)
		record.Related = s.getRelated(relCount)
		cacheLen := len(s.cache)
		for r := 0; r < relCount && cacheLen > 0; r++ {
			record.Related = append(record.Related, s.r.Intn(cacheLen))
		}

		// Add to cache
		idx := len(s.cache)
		s.cache = append(s.cache, record)
		s.indexByID[id] = idx
		s.indexByKey[key] = append(s.indexByKey[key], idx)

		// Event log as value string
		s.eventBuf = s.eventBuf[:0]
		s.eventBuf = append(s.eventBuf, "ingested:"...)
		s.eventBuf = append(s.eventBuf, id...)
		s.eventBuf = append(s.eventBuf, " key="...)
		s.eventBuf = append(s.eventBuf, key...)
		s.eventBuf = append(s.eventBuf, " size="...)
		s.eventBuf = appendInt(s.eventBuf, len(data))
		s.eventLog = append(s.eventLog, string(s.eventBuf))

		if i%200 == 0 {
			snap := s.makeSnapshotUnlocked()
			s.snapshots = append(s.snapshots, snap)
		}

		// Proper cache compaction to release memory
		if len(s.cache) > 10000 {
			s.compactCacheUnlocked()
		}

		if i%777 == 0 {
			s.rebuildIndexesUnlocked()
		}

		s.mu.Unlock()
	}
}

// compactCacheUnlocked properly releases memory by copying to new slice
func (s *HeavyService) compactCacheUnlocked() {
	old := s.cache
	if len(old) <= 5000 {
		return
	}
	kept := old[5000:]
	newCache := make([]LargeRecord, 0, 10000)
	newCache = append(newCache, kept...)

	// Recycle evicted records so their internal backing arrays can be reused,
	// rather than forcing the GC to discover and free them repeatedly.
	for i := 0; i < 5000; i++ {
		s.recycleRecord(&old[i])
	}

	s.cache = newCache
	// Rebuild indexes after compaction
	s.rebuildIndexesUnlocked()
}

func (s *HeavyService) makeSnapshotUnlocked() []byte {
	type snap struct {
		Count     int               `json:"count"`
		Keys      []string          `json:"keys"`
		RecentIDs []string          `json:"recent_ids"`
		MetaDump  map[string]string `json:"meta_dump"`
	}

	keys := make([]string, 0, len(s.indexByKey))
	for k := range s.indexByKey {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	recentIDs := make([]string, 0, 50)
	for i := len(s.cache) - 1; i >= 0 && len(recentIDs) < 50; i-- {
		if s.cache[i].ID != "" {
			recentIDs = append(recentIDs, s.cache[i].ID)
		}
	}

	metaDump := make(map[string]string, len(s.indexByID))
	for k, idx := range s.indexByID {
		if idx < len(s.cache) {
			// Use simpler format without pointer address
			metaDump[k] = "id=" + k
		}
	}

	payload := snap{
		Count:     len(s.cache),
		Keys:      keys,
		RecentIDs: recentIDs,
		MetaDump:  metaDump,
	}

	b, _ := json.Marshal(payload)
	// Return direct slice, no extra copy
	return b
}

func (s *HeavyService) rebuildIndexesUnlocked() {
	s.indexByID = make(map[string]int, len(s.cache))
	s.indexByKey = make(map[string][]int, 50)

	for idx, rec := range s.cache {
		if rec.ID == "" {
			continue
		}
		s.indexByID[rec.ID] = idx
		if rec.MetaKey != "" {
			s.indexByKey[rec.MetaKey] = append(s.indexByKey[rec.MetaKey], idx)
		}
	}
}

func (s *HeavyService) backgroundMaintenance() {
	defer close(s.bgDone)

	t := time.NewTicker(250 * time.Millisecond)
	defer t.Stop()

	for {
		select {
		case <-s.bgStop:
			return
		case <-t.C:
			s.mu.Lock()
			rep := s.ReportStatsUnlocked()
			s.lastReports = append(s.lastReports, rep)

			// Proper compaction for event log
			if len(s.eventLog) > 20000 {
				newLog := make([]string, 0, 20000)
				newLog = append(newLog, s.eventLog[10000:]...)
				s.eventLog = newLog
			}
			// Proper compaction for reports
			if len(s.lastReports) > 2000 {
				newReports := make([]string, 0, 2000)
				newReports = append(newReports, s.lastReports[1000:]...)
				s.lastReports = newReports
			}
			// Proper compaction for snapshots
			if len(s.snapshots) > 200 {
				newSnaps := make([][]byte, 0, 200)
				newSnaps = append(newSnaps, s.snapshots[100:]...)
				s.snapshots = newSnaps
			}
			// Removed cache duplication churn that was adding overhead

			s.mu.Unlock()
		}
	}
}

func (s *HeavyService) ReportStatsUnlocked() string {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	// Use buffer reuse for string building
	buf := make([]byte, 0, 64)
	buf = append(buf, "Alloc="...)
	buf = appendInt(buf, int(m.Alloc/1024/1024))
	buf = append(buf, "MiB TotalAlloc="...)
	buf = appendInt(buf, int(m.TotalAlloc/1024/1024))
	buf = append(buf, "MiB Sys="...)
	buf = appendInt(buf, int(m.Sys/1024/1024))
	buf = append(buf, "MiB NumGC="...)
	buf = appendInt(buf, int(m.NumGC))
	return string(buf)
}

func ReportStats() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	// Keep same output format as before, using fmt.Printf for compatibility
	fmt.Printf("Alloc = %v MiB", m.Alloc/1024/1024)
	fmt.Printf("\tTotalAlloc = %v MiB", m.TotalAlloc/1024/1024)
	fmt.Printf("\tSys = %v MiB", m.Sys/1024/1024)
	fmt.Printf("\tNumGC = %v\n", m.NumGC)
}

