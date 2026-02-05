package main

import (
	"time"
)

type RateLimiter struct {
	tokens     map[string]int
	maxTokens  int
	refillRate int
	lastRefill map[string]time.Time
}

func NewRateLimiter(maxTokens, refillRate int) *RateLimiter {
	return &RateLimiter{
		tokens:     make(map[string]int),
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: make(map[string]time.Time),
	}
}

func (r *RateLimiter) Allow(key string) bool {
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

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

