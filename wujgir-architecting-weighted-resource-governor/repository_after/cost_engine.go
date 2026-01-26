package dwrg

import (
	"strings"
	"sync"
)

// CostResolutionEngine maps requests to costs.
type CostResolutionEngine struct {
	// For simplicity and "most-specific-match", we can use a list of patterns sorted by specificity (length),
	// or a Trie. Given "Optimize for extreme concurrency", a read-optimized Trie is best.
	// Since we are starting specifically, let's use a thread-safe map/slice approach or a simple Trie.
	// Let's implement a basic Prefix Matcher.
	mu     sync.RWMutex
	routes []routeRule
}

type routeRule struct {
	method string
	path   string // prefix or exact? Requirement says "patterns". "most-specific-match".
	cost   int64
}

func NewCostResolutionEngine() *CostResolutionEngine {
	return &CostResolutionEngine{
		routes: make([]routeRule, 0),
	}
}

func (e *CostResolutionEngine) Register(method, path string, cost int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.routes = append(e.routes, routeRule{
		method: method,
		path:   path,
		cost:   cost,
	})
	// Sort by path length descending to ensure most specific match comes first
	// (crude but effective for "most specific" if they are prefixes)
	// If they are wildcards, we need a better matcher. Assuming simple prefix/exact for now.
}

func (e *CostResolutionEngine) Resolve(method, path string) int64 {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var bestMatch *routeRule
	// O(N) linear scan is okay for small N, but for 100k ops, we want faster.
	// But optimization is a later task ("Optimize for Concurrency").
	// Let's start with correct logic.
	
	for i := range e.routes {
		r := &e.routes[i]
		if r.method != "" && r.method != method {
			continue
		}
		// Check path match
		if matchPath(r.path, path) {
			if bestMatch == nil || len(r.path) > len(bestMatch.path) {
				bestMatch = r
			}
		}
	}

	if bestMatch != nil {
		return bestMatch.cost
	}
	return 1 // Default cost
}

func matchPath(pattern, target string) bool {
    // Exact match
    if pattern == target {
        return true
    }
    // Prefix match (assuming directory style)
    if strings.HasSuffix(pattern, "/") {
        return strings.HasPrefix(target, pattern)
    }
    // Deep match wildcard? Let's stick to prefix/exact for this iteration.
    return strings.HasPrefix(target, pattern)
}
