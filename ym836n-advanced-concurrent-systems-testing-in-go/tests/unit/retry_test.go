package unit

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 3: Retry Behavior - Validate retry count and backoff
func TestRetryBehavior(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	rand.SetValues(10, 20, 30) // Deterministic jitter
	dl := NewFakeDownloader(clock, rand)

	// First two attempts fail, third succeeds
	dl.SetResponses(1, []downloadResponse{
		{value: "", err: errors.New("fail1")},
		{value: "", err: errors.New("fail2")},
		{value: "success", err: nil},
	})

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     1,
		TimeoutPerItem: 5 * time.Second,
		Retries:        2,
		BaseBackoff:    100 * time.Millisecond,
		MaxBackoff:     500 * time.Millisecond,
	}

	go func() {
		time.Sleep(50 * time.Millisecond)
		clock.Advance(150 * time.Millisecond)
		time.Sleep(50 * time.Millisecond)
		clock.Advance(250 * time.Millisecond)
	}()

	results, errs := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, nil)

	if len(results) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(results))
	}

	if results[0] != "success" {
		t.Errorf("Expected 'success', got %s", results[0])
	}

	if errs[0] != nil {
		t.Errorf("Expected no error, got %v", errs[0])
	}

	if dl.GetCallCount(1) != 3 {
		t.Errorf("Expected 3 download attempts, got %d", dl.GetCallCount(1))
	}
}

// Test 4: Context Cancellation - Mid-flight cancellation must terminate cleanly
func TestContextCancellation(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	for i := 1; i <= 20; i++ {
		dl.SetResponse(i, fmt.Sprintf("value%d", i), nil)
	}

	opts := batch.ProcessOptions{
		MinWorkers:     2,
		MaxWorkers:     5,
		TimeoutPerItem: time.Second,
		Retries:        0,
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel after short delay
	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()

	ids := make([]int, 20)
	for i := range ids {
		ids[i] = i + 1
	}

	results, errs := batch.ProcessParallelOptimized(ctx, ids, dl, opts, nil)

	// Should complete without deadlock
	if len(results) != 20 {
		t.Fatalf("Expected 20 results, got %d", len(results))
	}

	if len(errs) != 20 {
		t.Fatalf("Expected 20 errors, got %d", len(errs))
	}
}
