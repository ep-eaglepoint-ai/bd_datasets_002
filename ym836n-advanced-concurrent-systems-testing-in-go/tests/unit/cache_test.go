package unit

import (
	"context"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 5: Cache Hit Bypasses Download
func TestCacheHitBypassesDownload(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	dl.SetResponse(1, "cached_value", nil)

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     2,
		TimeoutPerItem: time.Second,
		EnableCache:    true,
		CacheTTL:       time.Second,
		Retries:        0,
	}

	// Process same ID multiple times in one batch - cache should prevent duplicate downloads
	results, errs := batch.ProcessParallelOptimized(context.Background(), []int{1, 1, 1}, dl, opts, nil)

	// All should return the cached value
	for i, result := range results {
		if result != "cached_value" || errs[i] != nil {
			t.Fatalf("Index %d failed: %s, %v", i, result, errs[i])
		}
	}

	// Should only download once, remaining 2 should be served from cache
	if dl.GetCallCount(1) != 1 {
		t.Errorf("Expected 1 download (others cached), got %d", dl.GetCallCount(1))
	}
}

// Test 6: Cache TTL Expiration
func TestCacheTTLExpiration(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	dl.SetResponses(1, []downloadResponse{
		{value: "first_value", err: nil},
		{value: "second_value", err: nil},
	})

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     1,
		TimeoutPerItem: time.Second,
		EnableCache:    true,
		CacheTTL:       500 * time.Millisecond,
		Retries:        0,
	}

	// First call
	results1, _ := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, nil)
	if results1[0] != "first_value" {
		t.Fatalf("First call: expected 'first_value', got %s", results1[0])
	}

	// Advance time past TTL
	clock.Advance(600 * time.Millisecond)

	// Second call - cache expired, should download again
	results2, _ := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, nil)
	if results2[0] != "second_value" {
		t.Errorf("Second call: expected 'second_value', got %s", results2[0])
	}

	if dl.GetCallCount(1) != 2 {
		t.Errorf("Expected 2 downloads (cache expired), got %d", dl.GetCallCount(1))
	}
}
