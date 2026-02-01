package dwrg

import (
	"regexp"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
)

// CostResolutionEngine maps requests to costs using a most-specific-match strategy.
// It supports concurrent lock-free reads using atomic value swapping (RCU-style).
type CostResolutionEngine struct {
	routes atomic.Value // stores []routeRule
	mu     sync.Mutex   // Protects writes (Register)
}

type routeRule struct {
	method  string
	path    string
	pattern *regexp.Regexp    // Compiled pattern for wildcard/param matching
	headers map[string]string
	cost    int64
	score   int  // Specificity score
	isExact bool // True if exact match (no patterns)
}

// NewCostResolutionEngine creates a new cost resolution engine.
func NewCostResolutionEngine() *CostResolutionEngine {
	e := &CostResolutionEngine{}
	e.routes.Store([]routeRule{})
	return e
}

// Register adds a new route with associated cost.
func (e *CostResolutionEngine) Register(method, path string, headers map[string]string, cost int64) {
	e.mu.Lock()
	defer e.mu.Unlock()

	current := e.routes.Load().([]routeRule)
	newRoutes := make([]routeRule, len(current)+1)
	copy(newRoutes, current)

	// Determine if path contains patterns
	isExact := !strings.Contains(path, "{") && !strings.Contains(path, "*")

	// Build regex pattern for path params and wildcards
	var pattern *regexp.Regexp
	if !isExact {
		// Robust segment-based regex generation
		parts := strings.Split(path, "/")
		var regexParts []string
		for _, part := range parts {
			if part == "*" {
				regexParts = append(regexParts, ".*")
			} else if strings.HasPrefix(part, "{") && strings.HasSuffix(part, "}") {
				// Path param: convert {id} to [^/]+
				regexParts = append(regexParts, "[^/]+")
			} else {
				// Literal segment: escape it
				regexParts = append(regexParts, regexp.QuoteMeta(part))
			}
		}
		regexStr := "^" + strings.Join(regexParts, "/") + "$"
		pattern = regexp.MustCompile(regexStr)
	}

	// Calculate specificity score
	// Weighting: Headers (1000 pts each) + Path length + Exact tie-breaker (1)
	score := len(headers) * 1000 + len(path)
	if isExact {
		score += 1
	}

	newRule := routeRule{
		method:  method,
		path:    path,
		pattern: pattern,
		headers: headers,
		cost:    cost,
		score:   score,
		isExact: isExact,
	}
	newRoutes[len(current)] = newRule

	// Sort by Score Descending
	sort.Slice(newRoutes, func(i, j int) bool {
		return newRoutes[i].score > newRoutes[j].score
	})

	e.routes.Store(newRoutes)
}

// Resolve finds the matching cost for a request.
func (e *CostResolutionEngine) Resolve(method, path string, headers map[string]string) int64 {
	routes := e.routes.Load().([]routeRule)

	for _, r := range routes {
		if r.method != "" && r.method != method {
			continue
		}

		if !matchHeaders(r.headers, headers) {
			continue
		}

		if matchPathRule(r, path) {
			return r.cost
		}
	}

	return 1 // Default cost
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

func matchPathRule(rule routeRule, target string) bool {
	// Exact match path (no patterns)
	if rule.isExact {
		if rule.path == target {
			return true
		}
		// Prefix match for paths ending with /
		if strings.HasSuffix(rule.path, "/") {
			return strings.HasPrefix(target, rule.path)
		}
		return false
	}

	// Pattern match
	if rule.pattern != nil {
		return rule.pattern.MatchString(target)
	}

	return false
}
