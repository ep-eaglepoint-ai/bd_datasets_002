package tests

import (
	"context"
	"runtime"
	"testing"
	"time"

	"aggregator"
)

// getGoroutineCount returns the current number of goroutines
func getGoroutineCount() int {
	return runtime.NumGoroutine()
}

// waitForGoroutines waits for goroutines to finish and checks for leaks
func waitForGoroutines(t *testing.T, initialCount int, maxWait time.Duration) {
	deadline := time.Now().Add(maxWait)
	for time.Now().Before(deadline) {
		runtime.GC() // Help trigger cleanup
		time.Sleep(10 * time.Millisecond)
		current := getGoroutineCount()
		if current <= initialCount {
			return
		}
	}
	current := getGoroutineCount()
	if current > initialCount {
		t.Errorf("Potential goroutine leak: started with %d goroutines, now have %d", initialCount, current)
	}
}

// Test 1: Fix goroutine leak in FetchAndAggregate when timeout occurs
func TestFetchAndAggregate_TimeoutGoroutineLeak(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
		{ID: "source_3", URL: "http://example.com/3"},
		{ID: "source_4", URL: "http://example.com/4"},
		{ID: "source_5", URL: "http://example.com/5"},
	}

	ctx := context.Background()
	// Use very short timeout to trigger timeout before workers complete
	result, err := aggregator.FetchAndAggregate(ctx, sources, 50*time.Millisecond)

	// Should get timeout error
	if err == nil {
		t.Error("Expected timeout error, got nil")
	}

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	// Verify we got partial results
	if result == nil {
		t.Error("Expected partial results, got nil")
	}
}

// Test 2: Fix goroutine leak in ProcessBatch when context is cancelled
func TestProcessBatch_ContextCancellationGoroutineLeak(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	batches := [][]aggregator.DataSource{
		{{ID: "source_1", URL: "http://example.com/1"}},
		{{ID: "source_2", URL: "http://example.com/2"}},
		{{ID: "source_3", URL: "http://example.com/3"}},
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel context shortly after starting
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	results, err := aggregator.ProcessBatch(ctx, batches)

	// Should get context cancellation error
	if err == nil {
		t.Error("Expected context cancellation error, got nil")
	}

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	// May have partial results
	_ = results
}

// Test 3: Fix goroutine leak in StreamResults when receiver stops consuming
func TestStreamResults_ReceiverStopsConsumingGoroutineLeak(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
		{ID: "source_3", URL: "http://example.com/3"},
	}

	ctx, cancel := context.WithCancel(context.Background())
	out := make(chan aggregator.Result, 1) // Small buffer to test blocking

	// Function should return immediately (fire-and-forget)
	err := aggregator.StreamResults(ctx, sources, out)
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}

	// Read one result then cancel context
	select {
	case <-out:
		// Got one result
	case <-time.After(200 * time.Millisecond):
		t.Error("Expected to receive at least one result")
	}

	// Cancel context - goroutines should exit
	cancel()

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}
}

// Test 4: Context cancellation propagation
func TestFetchAndAggregate_ContextCancellationPropagation(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
		{ID: "source_3", URL: "http://example.com/3"},
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel context shortly after starting
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	result, err := aggregator.FetchAndAggregate(ctx, sources, 5*time.Second)

	// Should get context cancellation error
	if err == nil {
		t.Error("Expected context cancellation error, got nil")
	}
	if err != context.Canceled {
		t.Errorf("Expected context.Canceled, got %v", err)
	}

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	// May have partial results
	if result == nil {
		t.Error("Expected partial results, got nil")
	}
}

// Test 5: Buffered channels prevent blocking
func TestFetchAndAggregate_BufferedChannelsPreventBlocking(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
		{ID: "source_3", URL: "http://example.com/3"},
	}

	ctx := context.Background()
	// Use timeout shorter than fetch time to test buffered channel behavior
	result, err := aggregator.FetchAndAggregate(ctx, sources, 50*time.Millisecond)

	// Should timeout, but workers should not block
	if err == nil {
		t.Error("Expected timeout error, got nil")
	}

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	// Verify we got partial results
	if result == nil {
		t.Error("Expected partial results, got nil")
	}
}

// Test 6: Proper channel closing semantics
func TestFetchAndAggregate_ChannelClosingSemantics(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
	}

	ctx := context.Background()
	result, err := aggregator.FetchAndAggregate(ctx, sources, 1*time.Second)

	// Should complete successfully
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	// Verify results
	if result == nil {
		t.Error("Expected results, got nil")
	}
	if len(result.Results) != 2 {
		t.Errorf("Expected 2 results, got %d", len(result.Results))
	}
}

// Test 7: Timer resource cleanup
func TestFetchAndAggregate_TimerCleanup(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
	}

	ctx := context.Background()
	// Use timeout to trigger timer
	result, err := aggregator.FetchAndAggregate(ctx, sources, 50*time.Millisecond)

	// Should timeout
	if err == nil {
		t.Error("Expected timeout error, got nil")
	}

	// Wait for goroutines to clean up (including timer goroutines)
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Timer goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}

	_ = result
}

// Test 8: Preserve function signatures and fire-and-forget behavior
func TestStreamResults_FireAndForgetBehavior(t *testing.T) {
	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
	}

	ctx := context.Background()
	out := make(chan aggregator.Result, 10)

	// Function should return immediately, not wait for goroutines
	start := time.Now()
	err := aggregator.StreamResults(ctx, sources, out)
	duration := time.Since(start)

	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}

	// Should return in < 10ms (fire-and-forget)
	if duration > 10*time.Millisecond {
		t.Errorf("Function should return immediately, took %v", duration)
	}

	// Results should arrive asynchronously
	time.Sleep(200 * time.Millisecond)
	select {
	case <-out:
		// Got result
	default:
		t.Error("Expected to receive results asynchronously")
	}
}

// Test 9: Maintain concurrent execution behavior
func TestFetchAndAggregate_ConcurrentExecution(t *testing.T) {
	sources := []aggregator.DataSource{
		{ID: "source_1", URL: "http://example.com/1"},
		{ID: "source_2", URL: "http://example.com/2"},
		{ID: "source_3", URL: "http://example.com/3"},
		{ID: "source_4", URL: "http://example.com/4"},
	}

	ctx := context.Background()
	start := time.Now()
	result, err := aggregator.FetchAndAggregate(ctx, sources, 1*time.Second)
	duration := time.Since(start)

	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}

	// Should complete in ~100ms (concurrent), not ~400ms (sequential)
	// Each fetch takes 100ms, so concurrent should be ~100ms
	if duration > 200*time.Millisecond {
		t.Errorf("Expected concurrent execution (~100ms), took %v (possibly sequential)", duration)
	}

	// Should have results from all sources
	if result == nil {
		t.Error("Expected results, got nil")
	}
	// source_3 returns error, so we should have 3 results and 1 error
	if len(result.Results) != 3 {
		t.Errorf("Expected 3 results, got %d", len(result.Results))
	}
	if len(result.Errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(result.Errors))
	}
}

// Test 10: Handle edge cases
func TestFetchAndAggregate_EdgeCases(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	ctx := context.Background()

	// Test 10a: Empty source list
	t.Run("EmptySourceList", func(t *testing.T) {
		result, err := aggregator.FetchAndAggregate(ctx, []aggregator.DataSource{}, 1*time.Second)
		if err != nil {
			t.Errorf("Expected nil error for empty list, got %v", err)
		}
		if result == nil {
			t.Error("Expected empty result, got nil")
		}
		if len(result.Results) != 0 || len(result.Errors) != 0 {
			t.Error("Expected empty results and errors")
		}
	})

	// Test 10b: Single source
	t.Run("SingleSource", func(t *testing.T) {
		sources := []aggregator.DataSource{
			{ID: "source_1", URL: "http://example.com/1"},
		}
		result, err := aggregator.FetchAndAggregate(ctx, sources, 1*time.Second)
		if err != nil {
			t.Errorf("Expected nil error, got %v", err)
		}
		if result == nil {
			t.Error("Expected result, got nil")
		}
		if len(result.Results) != 1 {
			t.Errorf("Expected 1 result, got %d", len(result.Results))
		}
	})

	// Test 10c: All sources failing
	t.Run("AllSourcesFailing", func(t *testing.T) {
		sources := []aggregator.DataSource{
			{ID: "source_3", URL: "http://example.com/3"}, // This one fails
		}
		result, err := aggregator.FetchAndAggregate(ctx, sources, 1*time.Second)
		if err != nil {
			t.Errorf("Expected nil error (errors in result), got %v", err)
		}
		if result == nil {
			t.Error("Expected result, got nil")
		}
		if len(result.Errors) != 1 {
			t.Errorf("Expected 1 error, got %d", len(result.Errors))
		}
	})

	// Test 10d: Context already cancelled
	t.Run("ContextAlreadyCancelled", func(t *testing.T) {
		cancelledCtx, cancel := context.WithCancel(context.Background())
		cancel()

		sources := []aggregator.DataSource{
			{ID: "source_1", URL: "http://example.com/1"},
		}
		result, err := aggregator.FetchAndAggregate(cancelledCtx, sources, 1*time.Second)
		if err == nil {
			t.Error("Expected context cancellation error, got nil")
		}
		if err != context.Canceled {
			t.Errorf("Expected context.Canceled, got %v", err)
		}
		if result != nil {
			t.Error("Expected nil result when context cancelled, got result")
		}
	})

	// Wait for all goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}
}

// Test ProcessBatch edge cases
func TestProcessBatch_EdgeCases(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	ctx := context.Background()

	// Empty batch list
	t.Run("EmptyBatchList", func(t *testing.T) {
		results, err := aggregator.ProcessBatch(ctx, [][]aggregator.DataSource{})
		if err != nil {
			t.Errorf("Expected nil error for empty batch list, got %v", err)
		}
		if len(results) != 0 {
			t.Errorf("Expected empty results, got %d", len(results))
		}
	})

	// Single batch
	t.Run("SingleBatch", func(t *testing.T) {
		batches := [][]aggregator.DataSource{
			{{ID: "source_1", URL: "http://example.com/1"}},
		}
		results, err := aggregator.ProcessBatch(ctx, batches)
		if err != nil {
			t.Errorf("Expected nil error, got %v", err)
		}
		if len(results) != 1 {
			t.Errorf("Expected 1 result, got %d", len(results))
		}
	})

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}
}

// Test StreamResults edge cases
func TestStreamResults_EdgeCases(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	ctx := context.Background()
	out := make(chan aggregator.Result, 10)

	// Empty source list
	t.Run("EmptySourceList", func(t *testing.T) {
		err := aggregator.StreamResults(ctx, []aggregator.DataSource{}, out)
		if err != nil {
			t.Errorf("Expected nil error for empty list, got %v", err)
		}
	})

	// Context already cancelled
	t.Run("ContextAlreadyCancelled", func(t *testing.T) {
		cancelledCtx, cancel := context.WithCancel(context.Background())
		cancel()

		sources := []aggregator.DataSource{
			{ID: "source_1", URL: "http://example.com/1"},
		}
		err := aggregator.StreamResults(cancelledCtx, sources, out)
		if err == nil {
			t.Error("Expected context cancellation error, got nil")
		}
		if err != context.Canceled {
			t.Errorf("Expected context.Canceled, got %v", err)
		}
	})

	// Wait for goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 500*time.Millisecond)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}
}

// TestMultipleOperations_NoGoroutineLeaks runs multiple operations across all functions
// to ensure no goroutine leaks accumulate over time
func TestMultipleOperations_NoGoroutineLeaks(t *testing.T) {
	initialGoroutines := getGoroutineCount()

	ctx := context.Background()

	// Run multiple operations
	for i := 0; i < 10; i++ {
		sources := []aggregator.DataSource{
			{ID: "source_1", URL: "http://example.com/1"},
			{ID: "source_2", URL: "http://example.com/2"},
		}

		// Test with timeout
		aggregator.FetchAndAggregate(ctx, sources, 50*time.Millisecond)

		// Test with context cancellation
		cancelledCtx, cancel := context.WithCancel(ctx)
		go func() {
			time.Sleep(10 * time.Millisecond)
			cancel()
		}()
		aggregator.FetchAndAggregate(cancelledCtx, sources, 1*time.Second)

		// Test ProcessBatch
		batches := [][]aggregator.DataSource{
			{{ID: "source_1", URL: "http://example.com/1"}},
		}
		aggregator.ProcessBatch(ctx, batches)

		// Test StreamResults
		out := make(chan aggregator.Result, 10)
		streamCtx, streamCancel := context.WithCancel(ctx)
		aggregator.StreamResults(streamCtx, sources, out)
		time.Sleep(50 * time.Millisecond)
		streamCancel()
	}

	// Wait for all goroutines to clean up
	waitForGoroutines(t, initialGoroutines, 1*time.Second)

	finalGoroutines := getGoroutineCount()
	if finalGoroutines > initialGoroutines {
		t.Errorf("Goroutine leak detected after multiple operations: started with %d, ended with %d", initialGoroutines, finalGoroutines)
	}
}
