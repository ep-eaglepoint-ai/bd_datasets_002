package aggregator_test

import (
	"aggregator"
	"context"
	"errors"
	"runtime"
	"testing"
	"time"
)

// Helper to check for leaks
func assertNoLeaks(t *testing.T, initialGoroutines int) {
	t.Helper()
	// Allow for some gc/scheduling time
	deadline := time.Now().Add(1 * time.Second)
	for time.Now().Before(deadline) {
		if runtime.NumGoroutine() <= initialGoroutines {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	final := runtime.NumGoroutine()
	if final > initialGoroutines {
		t.Errorf("Potential goroutine leak: started with %d, ended with %d", initialGoroutines, final)
	}
}

// Req 1 & 5 & 6: Fix FetchAndAggregate leak, use buffered channels, ensure closing
func TestFetchAndAggregate_LeakOnTimeout(t *testing.T) {
	initial := runtime.NumGoroutine()

	sources := []aggregator.DataSource{
		{ID: "s1", URL: "slow"},
		{ID: "s2", URL: "slow"},
		{ID: "s3", URL: "slow"},
	}

	// Use a very short timeout compared to the mock fetch time (100ms in original code)
	_, err := aggregator.FetchAndAggregate(context.Background(), sources, 10*time.Millisecond)
	if err == nil {
		t.Error("Expected timeout error")
	}

	assertNoLeaks(t, initial)
}

// Req 2 & 5: Fix ProcessBatch leak, buffered channels
func TestProcessBatch_LeakOnContextCancel(t *testing.T) {
	initial := runtime.NumGoroutine()

	batches := [][]aggregator.DataSource{
		{{ID: "b1s1"}, {ID: "b1s2"}},
		{{ID: "b2s1"}, {ID: "b2s2"}},
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel immediately to trigger early exit in receiver loop
	cancel()

	_, err := aggregator.ProcessBatch(ctx, batches)
	if err == nil && len(batches) > 0 {
		// It might return result or error depending on race, but shouldn't leak
	}

	assertNoLeaks(t, initial)
}

// Req 3 & 8: Fix StreamResults leak, fire-and-forget, blocked receiver
func TestStreamResults_LeakOnBlockedReceiver(t *testing.T) {
	initial := runtime.NumGoroutine()

	sources := []aggregator.DataSource{{ID: "s1"}, {ID: "s2"}}
	out := make(chan aggregator.Result) // Unbuffered

	ctx, cancel := context.WithCancel(context.Background())

	// Start streaming
	err := aggregator.StreamResults(ctx, sources, out)
	if err != nil {
		t.Fatalf("StreamResults failed: %v", err)
	}

	// Cancel context to signal producers to stop
	cancel()

	// We do NOT read from 'out', simulating a blocked/stopped receiver

	assertNoLeaks(t, initial)
}

// Req 4: Propagate context cancellation
func TestFetchAndAggregate_ContextCancel(t *testing.T) {
	initial := runtime.NumGoroutine()
	sources := []aggregator.DataSource{{ID: "s1"}}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Pre-cancelled

	start := time.Now()
	_, err := aggregator.FetchAndAggregate(ctx, sources, 1*time.Second)
	duration := time.Since(start)

	if duration > 50*time.Millisecond {
		t.Errorf("Expected immediate return on cancelled context, took %v", duration)
	}

	if err != context.Canceled && !errors.Is(err, context.Canceled) {
		t.Errorf("Expected context canceled error, got %v", err)
	}

	assertNoLeaks(t, initial)
}

// Req 7: Timer cleanup
func TestFetchAndAggregate_TimerCleanup(t *testing.T) {
	// This makes sure we don't leak timers (indirectly checked via goroutine leaks usually,
	initial := runtime.NumGoroutine()
	sources := []aggregator.DataSource{{ID: "fast"}}

	// Successful fast case
	for i := 0; i < 100; i++ {
		aggregator.FetchAndAggregate(context.Background(), sources, 1*time.Second)
	}

	assertNoLeaks(t, initial)
}

// Req 9: Concurrent Execution (Performance)
func TestFetchAndAggregate_Concurrency(t *testing.T) {
	sources := []aggregator.DataSource{
		{ID: "s1"}, {ID: "s2"}, {ID: "s3"},
	}

	start := time.Now()
	// Mock fetch takes 100ms. If sequential, it would take 300ms.
	// If concurrent, should be ~100ms.
	_, _ = aggregator.FetchAndAggregate(context.Background(), sources, 1*time.Second)
	duration := time.Since(start)

	if duration > 250*time.Millisecond {
		t.Errorf("Execution seemingly sequential, took %v", duration)
	}
}

// Req 10: Edge cases
func TestEdgeCases(t *testing.T) {
	initial := runtime.NumGoroutine()
	ctx := context.Background()

	// Empty source list
	res, err := aggregator.FetchAndAggregate(ctx, []aggregator.DataSource{}, 1*time.Second)
	if err != nil {
		t.Errorf("Empty sources should not error: %v", err)
	}
	if len(res.Results) != 0 {
		t.Errorf("Expected empty results")
	}

	// Single source
	res, err = aggregator.FetchAndAggregate(ctx, []aggregator.DataSource{{ID: "s1"}}, 1*time.Second)
	if err != nil {
		t.Errorf("Single source failed: %v", err)
	}
	if len(res.Results) != 1 {
		t.Errorf("Expected 1 result")
	}

	assertNoLeaks(t, initial)
}
