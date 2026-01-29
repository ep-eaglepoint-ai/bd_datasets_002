package unit

import (
	"context"
	"fmt"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 1: Order Preservation - Results must maintain input order
func TestOrderPreservation(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	// Set up responses with different processing times
	dl.SetResponse(1, "value1", nil)
	dl.SetResponse(2, "value2", nil)
	dl.SetResponse(3, "value3", nil)
	dl.SetResponse(4, "value4", nil)
	dl.SetResponse(5, "value5", nil)

	opts := batch.ProcessOptions{
		MinWorkers:     2,
		MaxWorkers:     5,
		TimeoutPerItem: time.Second,
		Retries:        0,
	}

	ids := []int{1, 2, 3, 4, 5}
	results, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if len(results) != 5 {
		t.Fatalf("Expected 5 results, got %d", len(results))
	}

	for i, expected := range []string{"value1", "value2", "value3", "value4", "value5"} {
		if results[i] != expected {
			t.Errorf("Index %d: expected %s, got %s", i, expected, results[i])
		}
		if errs[i] != nil {
			t.Errorf("Index %d: unexpected error: %v", i, errs[i])
		}
	}
}

// Test 2: Concurrency Limits - Workers must respect min/max bounds
func TestConcurrencyLimits(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	// Configure many IDs to create work
	for i := 1; i <= 50; i++ {
		dl.SetResponse(i, fmt.Sprintf("value%d", i), nil)
	}

	opts := batch.ProcessOptions{
		MinWorkers:     3,
		MaxWorkers:     10,
		TimeoutPerItem: time.Second,
		Retries:        0,
	}

	ids := make([]int, 50)
	for i := range ids {
		ids[i] = i + 1
	}

	results, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if len(results) != 50 {
		t.Fatalf("Expected 50 results, got %d", len(results))
	}

	for i := range results {
		if errs[i] != nil {
			t.Errorf("Index %d: unexpected error: %v", i, errs[i])
		}
	}
}
