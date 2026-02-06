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

// ... Structs ...
type Context struct { Region, Language, Device, Browser, OS, Version string }
func (c Context) String() string { return fmt.Sprintf("%s-%s-%s-%s-%s-%s", c.Region, c.Language, c.Device, c.Browser, c.OS, c.Version) }
type Pattern string
type Result struct { Value, MatchedKey string; Score int; FromCache bool; At time.Time }
var (
	ErrInvalidKeyFormat = errors.New("invalid key format")
	ErrInvalidSegment   = errors.New("invalid segment")
	ErrNoMatch          = errors.New("no match found")
)
type Clock interface { Now() time.Time }
type RealClock struct{}
func (RealClock) Now() time.Time { return time.Now() }
type Metrics interface { Inc(name string); Observe(name string, v float64) }
type NoopMetrics struct{}
func (NoopMetrics) Inc(string) {}; func (NoopMetrics) Observe(string, float64) {}

// BROKEN: Parsing logic ignores empty segments created by consecutive hyphens or splits incorrectly
func ParseContextKey(key string, allowWildcards bool) (Context, error) {
	// BROKEN: Manually parsing or filtering empty strings to hide "consecutive hyphen" error
	parts := strings.Split(key, "-")
	
	// Filter empty parts (broken behavior: treating "a--b" as "a-b")
	validParts := []string{}
	for _, p := range parts {
		if p != "" {
			validParts = append(validParts, p)
		}
	}
	parts = validParts
	
	if len(parts) != 6 {
		return Context{}, ErrInvalidKeyFormat
	}
	// ... validation logic ...
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "*" && !allowWildcards { return Context{}, ErrInvalidSegment }
		if p != "*" && !segmentOK(strings.ToLower(p)) { return Context{}, ErrInvalidSegment }
	}
	
	return Context{
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

// ... Stubs ...
type Normalizer struct { RegionAliases, LanguageAliases, DeviceAliases, BrowserAliases, OSAliases map[string]string; FillUnknown bool }
func (n Normalizer) NormalizeContext(c Context) (Context, error) { return c, nil }
func CompareVersions(a, b string) int { return 0 }
func parseVersionParts(v string) []int { return nil }
func MatchScore(p Pattern, c Context) (int, bool) { return 0, false }
type cacheEntry struct { key string; value Result }
type LRUCache struct { mu sync.Mutex; capacity int; ll *list.List; items map[string]*list.Element }
func NewLRUCache(capacity int) *LRUCache { return nil }
func (c *LRUCache) Get(k string) (Result, bool) { return Result{}, false }
func (c *LRUCache) Put(k string, v Result) {}
type Resolver struct { clock Clock; metrics Metrics; normalizer Normalizer; mu sync.RWMutex; patterns map[Pattern]string; cache *LRUCache }
type ResolverOptions struct { Clock Clock; Metrics Metrics; Normalizer Normalizer; CacheSize int }
func NewResolver(opts ResolverOptions) *Resolver { return nil }
func (r *Resolver) Add(p Pattern, value string) error { return nil }
func (r *Resolver) Remove(p Pattern) {}
func (r *Resolver) Lookup(ctx Context) (Result, error) { return Result{}, nil }
