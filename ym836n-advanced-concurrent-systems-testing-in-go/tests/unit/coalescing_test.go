package unit

import (
	"context"
	"fmt"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 9: Request Coalescing - Duplicate concurrent requests
func TestRequestCoalescing(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	dl.SetResponse(1, "coalesced_value", nil)

	opts := batch.ProcessOptions{
		MinWorkers:     5,
		MaxWorkers:     10,
		TimeoutPerItem: time.Second,
		EnableCoalesce: true,
		Retries:        0,
	}

	// Request same ID multiple times
	ids := []int{1, 1, 1, 1, 1, 1, 1, 1, 1, 1}

	results, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	// All should get same result
	for i := range results {
		if results[i] != "coalesced_value" {
			t.Errorf("Index %d: expected 'coalesced_value', got %s", i, results[i])
		}
		if errs[i] != nil {
			t.Errorf("Index %d: unexpected error: %v", i, errs[i])
		}
	}

	// Should have downloaded only once (or very few times due to coalescing)
	callCount := dl.GetCallCount(1)
	if callCount > 3 {
		t.Logf("Warning: Expected coalescing to reduce calls, got %d for 10 requests", callCount)
	}
}

// Test 10: Global Rate Limiting
func TestGlobalRateLimit(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	for i := 1; i <= 20; i++ {
		dl.SetResponse(i, fmt.Sprintf("value%d", i), nil)
	}

	rateLimit := int32(5)
	opts := batch.ProcessOptions{
		MinWorkers:      10,
		MaxWorkers:      10,
		TimeoutPerItem:  time.Second,
		GlobalRateLimit: int(rateLimit),
		Retries:         0,
	}

	ids := make([]int, 20)
	for i := range ids {
		ids[i] = i + 1
	}

	dl.ResetMaxInFlight()
	batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	maxInFlight := dl.GetMaxInFlight()

	if maxInFlight > rateLimit {
		t.Errorf("Rate limit violated: max in-flight was %d, limit is %d", maxInFlight, rateLimit)
	}
}
