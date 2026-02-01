package analyzer

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/rand"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type LargeRecord struct {
	ID         *string
	Data       *[]byte
	Meta       map[string]*string
	Related    []*LargeRecord
	Tags       []*string
	History    *[]*string
	Hash       *[]byte
	Encoded    *string
	Attributes *[]map[string]*string
}

type HeavyService struct {
	mu          sync.Mutex
	cache       []*LargeRecord
	indexByID   map[string]*LargeRecord
	indexByKey  map[string][]*LargeRecord
	eventLog    []*string
	snapshots   []*[]byte
	lastReports []*string

	bgStop chan struct{}
	bgDone chan struct{}
	r      *rand.Rand
}

func NewHeavyService() *HeavyService {
	s := &HeavyService{
		cache:       make([]*LargeRecord, 0),
		indexByID:   make(map[string]*LargeRecord),
		indexByKey:  make(map[string][]*LargeRecord),
		eventLog:    make([]*string, 0),
		snapshots:   make([]*[]byte, 0),
		lastReports: make([]*string, 0),
		bgStop:      make(chan struct{}),
		bgDone:      make(chan struct{}),
		r:           rand.New(rand.NewSource(time.Now().UnixNano())),
	}
	go s.backgroundMaintenance() // intentionally adds more overhead
	return s
}

func (s *HeavyService) Close() {
	close(s.bgStop)
	<-s.bgDone
}

func (s *HeavyService) Ingest(count int) {
	for i := 0; i < count; i++ {
		s.mu.Lock()
		idParts := []string{"id", "-", strconv.Itoa(i), "-", strconv.FormatInt(time.Now().UnixNano(), 10)}
		idJoined := strings.Join(idParts, "") // allocates
		id := idJoined                        // new string header ref
		data := make([]byte, 1024)
		for j := 0; j < len(data); j++ {
			data[j] = byte(s.r.Intn(256))
		}
		dataCopy1 := append([]byte(nil), data...)
		dataCopy2 := make([]byte, len(dataCopy1))
		copy(dataCopy2, dataCopy1)
		meta := make(map[string]*string)
		key := fmt.Sprintf("key-%d", s.r.Intn(50)) // allocates
		meta[key] = &id                            // pointer to string
		tags := make([]*string, 0, 10)
		for t := 0; t < 10; t++ {
			tag := fmt.Sprintf("tag-%d-%d", t, s.r.Intn(99999))
			tags = append(tags, &tag)
		}
		h := make([]*string, 0, 5)
		for k := 0; k < 5; k++ {
			msg := fmt.Sprintf("created:%s:%d", id, k)
			h = append(h, &msg)
		}
		history := &h
		sum := sha256.Sum256(dataCopy2)
		hashBytes := make([]byte, 0, len(sum))
		hashBytes = append(hashBytes, sum[:]...) // copy
		hash := &hashBytes
		enc := base64.StdEncoding.EncodeToString(hashBytes)
		encoded := &enc
		attrs := make([]map[string]*string, 0, 3)
		for a := 0; a < 3; a++ {
			m := make(map[string]*string)
			v1 := fmt.Sprintf("v-%d-%d", a, s.r.Intn(100000))
			v2 := fmt.Sprintf("w-%d-%d", a, s.r.Intn(100000))
			m["a"] = &v1
			m["b"] = &v2
			attrs = append(attrs, m)
		}
		attributes := &attrs
		record := &LargeRecord{
			ID:         &id,
			Data:       &dataCopy2, // pointer to slice header
			Meta:       meta,
			Tags:       tags,
			History:    history,
			Hash:       hash,
			Encoded:    encoded,
			Attributes: attributes,
		}
		relCount := 5 + s.r.Intn(10)
		record.Related = make([]*LargeRecord, 0, relCount)
		for r := 0; r < relCount && len(s.cache) > 0; r++ {
			record.Related = append(record.Related, s.cache[s.r.Intn(len(s.cache))])
		}

		s.cache = append(s.cache, record)
		s.indexByID[id] = record
		s.indexByKey[key] = append(s.indexByKey[key], record)

		ev := fmt.Sprintf("ingested:%s key=%s size=%d", id, key, len(dataCopy2))
		s.eventLog = append(s.eventLog, &ev)

		if i%200 == 0 {
			s.snapshots = append(s.snapshots, s.makeSnapshotUnlocked())
		}

		if len(s.cache) > 10000 {
			s.cache = s.cache[5000:]
		}

		if i%777 == 0 {
			s.rebuildIndexesUnlocked()
		}

		s.mu.Unlock()
	}
}

func (s *HeavyService) makeSnapshotUnlocked() *[]byte {
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
	sort.Strings(keys) // extra work

	recentIDs := make([]string, 0, 50)
	for i := len(s.cache) - 1; i >= 0 && len(recentIDs) < 50; i-- {
		if s.cache[i] != nil && s.cache[i].ID != nil && *s.cache[i].ID != "" {
			recentIDs = append(recentIDs, *s.cache[i].ID)
		}
	}

	metaDump := make(map[string]string)
	for k, v := range s.indexByID {
		metaDump[k] = fmt.Sprintf("ptr=%p id=%s", v, k)
	}

	payload := snap{
		Count:     len(s.cache),
		Keys:      keys,
		RecentIDs: recentIDs,
		MetaDump:  metaDump,
	}

	b, _ := json.Marshal(payload) // allocates
	var buf bytes.Buffer
	buf.Write(b)
	out := buf.Bytes()
	copied := append([]byte(nil), out...) // extra copy

	return &copied
}

func (s *HeavyService) rebuildIndexesUnlocked() {
	s.indexByID = make(map[string]*LargeRecord)
	s.indexByKey = make(map[string][]*LargeRecord)

	for _, rec := range s.cache {
		if rec == nil || rec.ID == nil {
			continue
		}
		id := *rec.ID
		s.indexByID[id] = rec
		for k := range rec.Meta {
			s.indexByKey[k] = append(s.indexByKey[k], rec)
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
			s.lastReports = append(s.lastReports, &rep)

			if len(s.eventLog) > 20000 {
				s.eventLog = s.eventLog[10000:]
			}
			if len(s.lastReports) > 2000 {
				s.lastReports = s.lastReports[1000:]
			}
			if len(s.snapshots) > 200 {
				s.snapshots = s.snapshots[100:]
			}
			if len(s.cache) > 0 && s.r.Intn(3) == 0 {
				for i := 0; i < 100 && i < len(s.cache); i++ {
					s.cache = append(s.cache, s.cache[s.r.Intn(len(s.cache))])
				}
			}

			s.mu.Unlock()
		}
	}
}

func (s *HeavyService) ReportStatsUnlocked() string {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return fmt.Sprintf("Alloc=%dMiB TotalAlloc=%dMiB Sys=%dMiB NumGC=%d",
		m.Alloc/1024/1024,
		m.TotalAlloc/1024/1024,
		m.Sys/1024/1024,
		m.NumGC,
	)
}

func ReportStats() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	fmt.Printf("Alloc = %v MiB", m.Alloc/1024/1024)
	fmt.Printf("\tTotalAlloc = %v MiB", m.TotalAlloc/1024/1024)
	fmt.Printf("\tSys = %v MiB", m.Sys/1024/1024)
	fmt.Printf("\tNumGC = %v\n", m.NumGC)
}
