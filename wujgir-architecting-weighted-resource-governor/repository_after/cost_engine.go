package dwrg

import (
	"sort"
	"strings"
	"sync"
	"sync/atomic"
)

// CostResolutionEngine maps requests to costs using a most-specific-match strategy.
// It supports concurrent lock-free reads using atomic value swapping (RCU-style).
type CostResolutionEngine struct {
	// routes stores []routeRule
	routes atomic.Value
	mu     sync.Mutex // Protects writes (Register)
}

type routeRule struct {
	method  string
	path    string            // Exact or Prefix
	headers map[string]string // Optional exact match headers
	cost    int64
	
	// score is pre-calculated specificity score
	score   int
}

func NewCostResolutionEngine() *CostResolutionEngine {
	e := &CostResolutionEngine{}
	e.routes.Store([]routeRule{})
	return e
}

// Register adds a new route with associated cost.
// Rules are prioritized by "specificity":
// 1. Headers present (more headers = higher priority)
// 2. Exact match vs Prefix (not explicitly distinguished here, but longer path length usually implies more specific)
// 3. Path length (longer = more specific)
func (e *CostResolutionEngine) Register(method, path string, headers map[string]string, cost int64) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Load existing
	current := e.routes.Load().([]routeRule)
	
	// Copy to new slice
	newRoutes := make([]routeRule, len(current)+1)
	copy(newRoutes, current)

	// Calculate specificity score
	// Weighting:
	// - Headers: 1000 points per header
	// - Path Length: 1 point per char
	// This ensures header matches always override simple path matches, 
	// and longer paths override shorter paths.
	score := len(headers) * 1000 + len(path)

	newRule := routeRule{
		method:  method,
		path:    path,
		headers: headers,
		cost:    cost,
		score:   score,
	}
	newRoutes[len(current)] = newRule

	// Sort by Score Descending
	sort.Slice(newRoutes, func(i, j int) bool {
		return newRoutes[i].score > newRoutes[j].score
	})

	// Store atomically
	e.routes.Store(newRoutes)
}

// Resolve finds the matching cost for a request.
// It iterates through the pre-sorted rules and returns the first match (most specific).
func (e *CostResolutionEngine) Resolve(method, path string, headers map[string]string) int64 {
	// Atomic load - Lock Free
	routes := e.routes.Load().([]routeRule)

	for _, r := range routes {
		if r.method != "" && r.method != method {
			continue
		}
		
		// Check headers first (high specificity)
		if !matchHeaders(r.headers, headers) {
			continue
		}

		// Check path
		if matchPath(r.path, path) {
			return r.cost
		}
	}
	
	return 1 // Default cost if no match found
}

func matchHeaders(required, actual map[string]string) bool {
	if len(required) == 0 {
		return true
	}
	if len(actual) == 0 {
		return false
	}
	for k, v := range required {
		if val, ok := actual[k]; !ok || val != v {
			return false
		}
	}
	return true
}

func matchPath(pattern, target string) bool {
    // Exact match
    if pattern == target {
        return true
    }
    // Prefix match (assuming directory style)
	// If pattern ends with /, it's a prefix match.
	// If pattern doesn't end with /, we likely treat it as exact match
	// UNLESS the requirement implies all paths are patterns. 
	// "mapping logic must handle overlapping patterns" implies usage of patterns.
	// Let's support standard prefix behavior:
	// "/api/v1/" matches "/api/v1/foo"
	// "/api/v1" matches "/api/v1" (exact)
    if strings.HasSuffix(pattern, "/") {
        return strings.HasPrefix(target, pattern)
    }
	// Fallback: If strict exact match is required for non-slash patterns.
	// However, many routers treat "/users" as a prefix for "/users/123" only if 
	// configured. Let's stick to safe defaults: Exact or Explicit Prefix (/).
    return pattern == target
}
