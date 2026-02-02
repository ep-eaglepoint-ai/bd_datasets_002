package keys

import (
	"container/list"
	"errors"
	"fmt"
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

// ParseContextKey helper (Correct behavior needed for MatchScore to run)
func ParseContextKey(key string, allowWildcards bool) (Context, error) {
	parts := strings.Split(key, "-")
	if len(parts) != 6 { return Context{}, ErrInvalidKeyFormat }
	return Context{parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]}, nil
}

// BROKEN: Incorrect prefix matching logic
func MatchScore(p Pattern, c Context) (int, bool) {
	pc, err := ParseContextKey(string(p), true)
	if err != nil { return 0, false }

	scoreSeg := func(pv, cv string, version bool) (int, bool) {
		pv = strings.ToLower(pv)
		cv = strings.ToLower(cv)
		if pv == "*" { return 1, true }
		if !version {
			if pv == cv { return 10, true }
			return 0, false
		}
		if strings.HasSuffix(pv, ".*") {
			pre := strings.TrimSuffix(pv, ".*")
			// BROKEN: Only checks HasPrefix, doesn't enforce dot separator
			// "1.2.*" matches "1.20.1" (pre="1.2") -> HasPrefix("1.20.1", "1.2") is TRUE
			if strings.HasPrefix(cv, pre) {
				return 6, true
			}
		}
		if pv == cv { return 10, true }
		return 0, false
	}

	score := 0
	var ok bool
	// Simplified loop for fixture
	if s, k := scoreSeg(pc.Region, c.Region, false); !k { return 0, false } else { score += s }
	if s, k := scoreSeg(pc.Language, c.Language, false); !k { return 0, false } else { score += s }
	if s, k := scoreSeg(pc.Device, c.Device, false); !k { return 0, false } else { score += s }
	if s, k := scoreSeg(pc.Browser, c.Browser, false); !k { return 0, false } else { score += s }
	if s, k := scoreSeg(pc.OS, c.OS, false); !k { return 0, false } else { score += s }
	if s, k := scoreSeg(pc.Version, c.Version, true); !k { return 0, false } else { score += s; ok = true }

	return score, ok
}

// ... Stubs ...
type Normalizer struct { RegionAliases, LanguageAliases, DeviceAliases, BrowserAliases, OSAliases map[string]string; FillUnknown bool }
func (n Normalizer) NormalizeContext(c Context) (Context, error) { return c, nil }
func segmentOK(s string) bool { return true }
func CompareVersions(a, b string) int { return 0 }
func parseVersionParts(v string) []int { return nil }
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
