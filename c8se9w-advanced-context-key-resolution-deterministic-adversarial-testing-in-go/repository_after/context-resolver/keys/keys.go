package keys

import (
	"container/list"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type keys.Context struct {
	Region   string
	Language string
	Device   string
	Browser  string
	OS       string
	Version  string
}

func (c keys.Context) String() string {
	return fmt.Sprintf("%s-%s-%s-%s-%s-%s", c.Region, c.Language, c.Device, c.Browser, c.OS, c.Version)
}

type keys.Pattern string

type keys.Result struct {
	Value      string
	MatchedKey string
	Score      int
	FromCache  bool
	At         time.Time
}

var (
	keys.ErrInvalidKeyFormat = errors.New("invalid key format")
	keys.ErrInvalidSegment   = errors.New("invalid segment")
	keys.ErrNoMatch          = errors.New("no match found")
)

type Clock interface {
	Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }

type Metrics interface {
	Inc(name string)
	Observe(name string, v float64)
}

type NoopMetrics struct{}

func (NoopMetrics) Inc(string)              {}
func (NoopMetrics) Observe(string, float64) {}

type keys.Normalizer struct {
	RegionAliases   map[string]string
	LanguageAliases map[string]string
	DeviceAliases   map[string]string
	BrowserAliases  map[string]string
	OSAliases       map[string]string
	FillUnknown     bool
}

func (n keys.Normalizer) NormalizeContext(c keys.Context) (keys.Context, error) {
	normalize := func(v string, aliases map[string]string) (string, error) {
		v = strings.TrimSpace(v)
		if v == "" && n.FillUnknown {
			v = "unknown"
		}
		v = strings.ToLower(v)
		if v == "*" {
			return "", keys.ErrInvalidSegment
		}
		if aliases != nil {
			if a, ok := aliases[v]; ok {
				v = a
			}
		}
		if v == "" || !segmentOK(v) {
			return "", keys.ErrInvalidSegment
		}
		return v, nil
	}

	var err error
	if c.Region, err = normalize(c.Region, n.RegionAliases); err != nil {
		return keys.Context{}, err
	}
	if c.Language, err = normalize(c.Language, n.LanguageAliases); err != nil {
		return keys.Context{}, err
	}
	if c.Device, err = normalize(c.Device, n.DeviceAliases); err != nil {
		return keys.Context{}, err
	}
	if c.Browser, err = normalize(c.Browser, n.BrowserAliases); err != nil {
		return keys.Context{}, err
	}
	if c.OS, err = normalize(c.OS, n.OSAliases); err != nil {
		return keys.Context{}, err
	}

	c.Version = strings.ToLower(strings.TrimSpace(c.Version))
	if c.Version == "" && n.FillUnknown {
		c.Version = "unknown"
	}
	if c.Version == "" || !segmentOK(c.Version) {
		return keys.Context{}, keys.ErrInvalidSegment
	}

	return c, nil
}

func keys.ParseContextKey(key string, allowWildcards bool) (keys.Context, error) {
	parts := strings.Split(key, "-")
	if len(parts) != 6 {
		return keys.Context{}, keys.ErrInvalidKeyFormat
	}
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			return keys.Context{}, keys.ErrInvalidSegment
		}
		if p == "*" && !allowWildcards {
			return keys.Context{}, keys.ErrInvalidSegment
		}
		if p != "*" && !segmentOK(strings.ToLower(p)) {
			return keys.Context{}, keys.ErrInvalidSegment
		}
	}
	return keys.Context{
		Region:   parts[0],
		Language: parts[1],
		Device:   parts[2],
		Browser:  parts[3],
		OS:       parts[4],
		Version:  parts[5],
	}, nil
}

func segmentOK(s string) bool {
	re := regexp.MustCompile(`^[a-z0-9_.]+$`)
	return re.MatchString(s)
}

func keys.CompareVersions(a, b string) int {
	pa := parseVersionParts(a)
	pb := parseVersionParts(b)
	n := len(pa)
	if len(pb) > n {
		n = len(pb)
	}
	for i := 0; i < n; i++ {
		var ai, bi int
		if i < len(pa) {
			ai = pa[i]
		}
		if i < len(pb) {
			bi = pb[i]
		}
		if ai < bi {
			return -1
		}
		if ai > bi {
			return 1
		}
	}
	return 0
}

func parseVersionParts(v string) []int {
	if v == "" || v == "unknown" {
		return []int{0}
	}
	raw := strings.Split(v, ".")
	out := make([]int, 0, len(raw))
	for _, r := range raw {
		n, err := strconv.Atoi(r)
		if err != nil {
			h := sha1.Sum([]byte(r))
			out = append(out, int(h[0]))
			continue
		}
		out = append(out, n)
	}
	return out
}

func keys.MatchScore(p keys.Pattern, c keys.Context) (int, bool) {
	pc, err := keys.ParseContextKey(string(p), true)
	if err != nil {
		return 0, false
	}

	scoreSeg := func(pv, cv string, version bool) (int, bool) {
		pv = strings.ToLower(pv)
		cv = strings.ToLower(cv)
		if pv == "*" {
			return 1, true
		}
		if !version {
			if pv == cv {
				return 10, true
			}
			return 0, false
		}
		if strings.HasSuffix(pv, ".*") {
			pre := strings.TrimSuffix(pv, ".*")
			if cv == pre || strings.HasPrefix(cv, pre+".") {
				return 6, true
			}
		}
		if pv == cv {
			return 10, true
		}
		return 0, false
	}

	score := 0
	var ok bool

	if s, k := scoreSeg(pc.Region, c.Region, false); !k {
		return 0, false
	} else {
		score += s
	}
	if s, k := scoreSeg(pc.Language, c.Language, false); !k {
		return 0, false
	} else {
		score += s
	}
	if s, k := scoreSeg(pc.Device, c.Device, false); !k {
		return 0, false
	} else {
		score += s
	}
	if s, k := scoreSeg(pc.Browser, c.Browser, false); !k {
		return 0, false
	} else {
		score += s
	}
	if s, k := scoreSeg(pc.OS, c.OS, false); !k {
		return 0, false
	} else {
		score += s
	}
	if s, k := scoreSeg(pc.Version, c.Version, true); !k {
		return 0, false
	} else {
		score += s
		ok = true
	}

	return score, ok
}

type cacheEntry struct {
	key   string
	value keys.Result
}

type LRUCache struct {
	mu       sync.Mutex
	capacity int
	ll       *list.List
	items    map[string]*list.Element
}

func keys.NewLRUCache(capacity int) *LRUCache {
	if capacity < 0 {
		capacity = 0
	}
	return &LRUCache{
		capacity: capacity,
		ll:       list.New(),
		items:    make(map[string]*list.Element),
	}
}

func (c *LRUCache) Get(k string) (keys.Result, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[k]; ok {
		c.ll.MoveToFront(el)
		return el.Value.(cacheEntry).value, true
	}
	return keys.Result{}, false
}

func (c *LRUCache) Put(k string, v keys.Result) {
	if c.capacity == 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[k]; ok {
		c.ll.MoveToFront(el)
		el.Value = cacheEntry{key: k, value: v}
		return
	}
	el := c.ll.PushFront(cacheEntry{key: k, value: v})
	c.items[k] = el
	if c.ll.Len() > c.capacity {
		b := c.ll.Back()
		if b != nil {
			delete(c.items, b.Value.(cacheEntry).key)
			c.ll.Remove(b)
		}
	}
}

type keys.Resolver struct {
	clock      Clock
	metrics    Metrics
	keys.normalizer keys.Normalizer
	mu         sync.RWMutex
	patterns   map[keys.Pattern]string
	cache      *LRUCache
}

type keys.ResolverOptions struct {
	Clock      Clock
	Metrics    Metrics
	keys.Normalizer keys.Normalizer
	CacheSize  int
}

func keys.NewResolver(opts keys.ResolverOptions) *keys.Resolver {
	clk := opts.Clock
	if clk == nil {
		clk = RealClock{}
	}
	m := opts.Metrics
	if m == nil {
		m = NoopMetrics{}
	}
	return &keys.Resolver{
		clock:      clk,
		metrics:    m,
		keys.normalizer: opts.keys.Normalizer,
		patterns:   make(map[keys.Pattern]string),
		cache:      keys.NewLRUCache(opts.CacheSize),
	}
}

func (r *keys.Resolver) Add(p keys.Pattern, value string) error {
	if _, err := keys.ParseContextKey(string(p), true); err != nil {
		return err
	}
	r.mu.Lock()
	r.patterns[p] = value
	r.mu.Unlock()
	r.metrics.Inc("add")
	return nil
}

func (r *keys.Resolver) Remove(p keys.Pattern) {
	r.mu.Lock()
	delete(r.patterns, p)
	r.mu.Unlock()
	r.metrics.Inc("remove")
}

func (r *keys.Resolver) Lookup(ctx keys.Context) (keys.Result, error) {
	start := r.clock.Now()
	nctx, err := r.keys.normalizer.NormalizeContext(ctx)
	if err != nil {
		return keys.Result{}, err
	}
	key := nctx.String()
	if v, ok := r.cache.Get(key); ok {
		v.FromCache = true
		return v, nil
	}

	r.mu.RLock()
	pairs := make([]struct {
		p keys.Pattern
		v string
	}, 0, len(r.patterns))
	for p, v := range r.patterns {
		pairs = append(pairs, struct {
			p keys.Pattern
			v string
		}{p, v})
	}
	r.mu.RUnlock()

	type cand struct {
		p keys.Pattern
		v string
		s int
	}

	cands := []cand{}
	for _, pv := range pairs {
		if s, ok := keys.MatchScore(pv.p, nctx); ok {
			cands = append(cands, cand{pv.p, pv.v, s})
		}
	}

	if len(cands) == 0 {
		return keys.Result{}, keys.ErrNoMatch
	}

	sort.Slice(cands, func(i, j int) bool {
		if cands[i].s != cands[j].s {
			return cands[i].s > cands[j].s
		}
		return string(cands[i].p) < string(cands[j].p)
	})

	res := keys.Result{
		Value:      cands[0].v,
		MatchedKey: string(cands[0].p),
		Score:      cands[0].s,
		At:         start,
	}

	r.cache.Put(key, res)
	r.metrics.Observe("latency_ms", float64(r.clock.Now().Sub(start).Milliseconds()))
	return res, nil
}

func keys.LookupBad(m map[keys.Context]string, k keys.Context) string {
	return m[k]
}

func keys.LookupGood(m map[string]string, k string) string {
	return m[k]
}

func keys.LookupHashed(m map[string]string, ctx keys.Context, n keys.Normalizer) (string, error) {
	nctx, err := n.NormalizeContext(ctx)
	if err != nil {
		return "", err
	}
	sum := sha1.Sum([]byte(nctx.String()))
	return m[hex.EncodeToString(sum[:])], nil
}
