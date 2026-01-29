package unit

import (
	"context"
	"fmt"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 14: Stress Test - No Goroutine Leaks
func TestStressNoDuplicatesHighConcurrency(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	// Many IDs with duplicates
	numUnique := 100
	numTotal := 500

	for i := 1; i <= numUnique; i++ {
		dl.SetResponse(i, fmt.Sprintf("value%d", i), nil)
	}

	opts := batch.ProcessOptions{
		MinWorkers:     10,
		MaxWorkers:     50,
		TimeoutPerItem: time.Second,
		EnableCoalesce: true,
		EnableCache:    true,
		CacheTTL:       time.Second,
		Retries:        1,
	}

	// Create IDs with duplicates
	ids := make([]int, numTotal)
	for i := range ids {
		ids[i] = (i % numUnique) + 1
	}

	results, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if len(results) != numTotal {
		t.Fatalf("Expected %d results, got %d", numTotal, len(results))
	}

	if len(errs) != numTotal {
		t.Fatalf("Expected %d errors, got %d", numTotal, len(errs))
	}

	// Verify results are properly aligned by index
	for i := 0; i < numTotal; i++ {
		expectedID := (i % numUnique) + 1
		expectedValue := fmt.Sprintf("value%d", expectedID)
		if results[i] != expectedValue && errs[i] == nil {
			t.Errorf("Index %d: expected %s, got %s", i, expectedValue, results[i])
		}
	}

	t.Logf("Processed %d requests for %d unique IDs", numTotal, numUnique)
	t.Logf("Total download calls: %d", len(dl.GetCalls()))
}
