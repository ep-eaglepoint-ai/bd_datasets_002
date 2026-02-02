package keys

import (
	"container/list"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ... (Copy structs/interfaces from correct.go to make it a standalone replacement)
type Context struct {
	Region   string
	Language string
	Device   string
	Browser  string
	OS       string
	Version  string
}

func (c Context) String() string {
	return fmt.Sprintf("%s-%s-%s-%s-%s-%s", c.Region, c.Language, c.Device, c.Browser, c.OS, c.Version)
}

type Pattern string

type Result struct {
	Value      string
	MatchedKey string
	Score      int
	FromCache  bool
	At         time.Time
}

var (
	ErrInvalidKeyFormat = errors.New("invalid key format")
	ErrInvalidSegment   = errors.New("invalid segment")
	ErrNoMatch          = errors.New("no match found")
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

type Normalizer struct {
	RegionAliases   map[string]string
	LanguageAliases map[string]string
	DeviceAliases   map[string]string
	BrowserAliases  map[string]string
	OSAliases       map[string]string
	FillUnknown     bool
}

// BROKEN: Does not trim space or lower case, just checks aliases and basic segments
func (n Normalizer) NormalizeContext(c Context) (Context, error) {

	
	// Override normalize to be even more broken to ensure it passes "segmentOK" but is wrong value
	normalizeBroken := func(v string, aliases map[string]string) (string, error) {
		// Don't lower case. don't trim.
		// But wait, if we don't lowercase "US", segmentOK(`^[a-z0-9_.]+$`) triggers and returns error.
		// So this implementation would return Error on valid input "US".
		// The test expects Success "us".
		// So the test will fail (Unexpected Error). This is detected.
		// What if we want to detect "doesn't handle mixed whitespace" specifically?
		// Input " us ". If we don't trim, it becomes " us ". segmentOK might reject space.
		// So mostly this will cause errors on inputs that require normalization.
		// That is sufficient to prove the test suite covers normalization.
		
		v = strings.ToLower(v) // Do minimal valid stuff to pass basic checks but fail advanced?
		// MISSING: TrimSpace.
		if v == "*" { return "", ErrInvalidSegment }
		if aliases != nil { if a, ok := aliases[v]; ok { v = a } }
		if !segmentOK(v) { return "", ErrInvalidSegment }
		return v, nil
	}

	var err error
	if c.Region, err = normalizeBroken(c.Region, n.RegionAliases); err != nil { return Context{}, err }
	if c.Language, err = normalizeBroken(c.Language, n.LanguageAliases); err != nil { return Context{}, err }
	if c.Device, err = normalizeBroken(c.Device, n.DeviceAliases); err != nil { return Context{}, err }
	if c.Browser, err = normalizeBroken(c.Browser, n.BrowserAliases); err != nil { return Context{}, err }
	if c.OS, err = normalizeBroken(c.OS, n.OSAliases); err != nil { return Context{}, err }
	c.Version = strings.ToLower(c.Version) // Missing TrimSpace
	if c.Version == "" && n.FillUnknown { c.Version = "unknown" }
	if !segmentOK(c.Version) { return Context{}, ErrInvalidSegment }
	return c, nil
}

// ... Copy rest of helpers ...
func ParseContextKey(key string, allowWildcards bool) (Context, error) {
	parts := strings.Split(key, "-")
	if len(parts) != 6 { return Context{}, ErrInvalidKeyFormat }
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" { return Context{}, ErrInvalidSegment }
		if p == "*" && !allowWildcards { return Context{}, ErrInvalidSegment }
		if p != "*" && !segmentOK(strings.ToLower(p)) { return Context{}, ErrInvalidSegment }
	}
	return Context{parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]}, nil
}

func segmentOK(s string) bool {
	// Relaxed regex to allow spaces? No, keep strict to force error if not trimmed?
	// Or maybe this broken impl has a customized segmentOK that allows spaces, 
	// so it returns " us " and test sees " us " != "us".
	re := regexp.MustCompile(`^[a-z0-9_. ]+$`) // Added space
	return re.MatchString(s)
}

func CompareVersions(a, b string) int { return 0 } // Stub
func parseVersionParts(v string) []int { return nil } // Stub
func MatchScore(p Pattern, c Context) (int, bool) { return 0, false } // Stub
type cacheEntry struct { key string; value Result }
type LRUCache struct { mu sync.Mutex; capacity int; ll *list.List; items map[string]*list.Element }
func NewLRUCache(capacity int) *LRUCache { return &LRUCache{capacity: capacity, ll: list.New(), items: make(map[string]*list.Element)} }
func (c *LRUCache) Get(k string) (Result, bool) { return Result{}, false }
func (c *LRUCache) Put(k string, v Result) {}
type Resolver struct { clock Clock; metrics Metrics; normalizer Normalizer; mu sync.RWMutex; patterns map[Pattern]string; cache *LRUCache }
type ResolverOptions struct { Clock Clock; Metrics Metrics; Normalizer Normalizer; CacheSize int }
func NewResolver(opts ResolverOptions) *Resolver { return nil }
func (r *Resolver) Add(p Pattern, value string) error { return nil }
func (r *Resolver) Remove(p Pattern) {}
func (r *Resolver) Lookup(ctx Context) (Result, error) { return Result{}, nil }
