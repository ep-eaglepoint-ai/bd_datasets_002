package repository_after

import "sync"

// MetricStore defines the interface for metric storage operations
type MetricStore interface {
	Inc(key string)
	Get(key string) int
}

// ConcurrentMetricStore implements MetricStore using sync.RWMutex for safe concurrent access
type ConcurrentMetricStore struct {
	mu     sync.RWMutex
	store  map[string]int
}

// NewConcurrentMetricStore creates a new thread-safe metric store
func NewConcurrentMetricStore() *ConcurrentMetricStore {
	return &ConcurrentMetricStore{
		store: make(map[string]int),
	}
}

// Inc increments the counter for the given key
func (c *ConcurrentMetricStore) Inc(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.store[key]++
}

// Get retrieves the current count for the given key
func (c *ConcurrentMetricStore) Get(key string) int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.store[key]
}
