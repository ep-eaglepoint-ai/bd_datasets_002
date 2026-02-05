package gateway

import (
	"sync"
	"time"
)

type RateLimiter struct {
	tokens     map[string]int
	maxTokens  int
	refillRate int
	lastRefill map[string]time.Time
	mu         sync.Mutex
}

func NewRateLimiter(maxTokens, refillRate int) *RateLimiter {
	rl := &RateLimiter{
		tokens:     make(map[string]int),
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: make(map[string]time.Time),
	}

	go rl.cleanupLoop()
	return rl
}

func (r *RateLimiter) Allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()

	if _, exists := r.tokens[key]; !exists {
		r.tokens[key] = r.maxTokens
		r.lastRefill[key] = now
	}

	elapsed := now.Sub(r.lastRefill[key])
	tokensToAdd := int(elapsed.Seconds()) * r.refillRate

	if tokensToAdd > 0 {
		r.tokens[key] = min(r.tokens[key]+tokensToAdd, r.maxTokens)
		r.lastRefill[key] = now
	}

	if r.tokens[key] > 0 {
		r.tokens[key]--
		return true
	}

	return false
}

func (r *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		r.cleanup()
	}
}

func (r *RateLimiter) cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for key, lastRefill := range r.lastRefill {
		if now.Sub(lastRefill) > 1*time.Minute {
			delete(r.tokens, key)
			delete(r.lastRefill, key)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
