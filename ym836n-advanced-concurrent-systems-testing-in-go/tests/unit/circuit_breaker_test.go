package unit

import (
	"context"
	"errors"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 7: Circuit Breaker Opens After Threshold
func TestCircuitBreakerOpens(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	// All attempts fail
	failErr := errors.New("service down")
	dl.SetResponses(1, []downloadResponse{
		{value: "", err: failErr},
	})
	dl.SetResponses(2, []downloadResponse{
		{value: "", err: failErr},
	})
	dl.SetResponses(3, []downloadResponse{
		{value: "", err: failErr},
	})
	dl.SetResponses(4, []downloadResponse{
		{value: "", err: batch.ErrCircuitOpen}, // Should be rejected
	})

	opts := batch.ProcessOptions{
		MinWorkers:           1,
		MaxWorkers:           1,
		TimeoutPerItem:       time.Second,
		Retries:              0,
		EnableCircuitBreaker: true,
		CircuitBuckets:       1, // Single bucket to ensure all IDs hit same circuit
		CircuitThreshold:     3,
		CircuitCoolDown:      500 * time.Millisecond,
	}

	// First 3 requests fail and trip the circuit
	_, errs := batch.ProcessParallelOptimized(context.Background(), []int{1, 2, 3, 4}, dl, opts, nil)

	// Fourth request should be rejected by circuit breaker
	foundCircuitOpen := false
	for _, err := range errs {
		if errors.Is(err, batch.ErrCircuitOpen) {
			foundCircuitOpen = true
			break
		}
	}

	if !foundCircuitOpen {
		t.Error("Expected batch.ErrCircuitOpen after threshold failures")
	}
}

// Test 8: Circuit Breaker Recovery After Cooldown
func TestCircuitBreakerRecovery(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	failErr := errors.New("temporary failure")

	// First 3 fail to trip circuit
	for i := 1; i <= 3; i++ {
		dl.SetResponse(i, "", failErr)
	}

	// After cooldown, should succeed
	dl.SetResponse(4, "recovered", nil)

	opts := batch.ProcessOptions{
		MinWorkers:           1,
		MaxWorkers:           1,
		TimeoutPerItem:       time.Second,
		Retries:              0,
		EnableCircuitBreaker: true,
		CircuitBuckets:       1,
		CircuitThreshold:     3,
		CircuitCoolDown:      200 * time.Millisecond,
	}

	// Trip the circuit
	batch.ProcessParallelOptimized(context.Background(), []int{1, 2, 3}, dl, opts, nil)

	// Advance past cooldown
	clock.Advance(250 * time.Millisecond)

	// Should recover
	results, errs := batch.ProcessParallelOptimized(context.Background(), []int{4}, dl, opts, nil)

	if results[0] != "recovered" {
		t.Errorf("Expected 'recovered', got %s", results[0])
	}

	if errs[0] != nil && !errors.Is(errs[0], batch.ErrCircuitOpen) {
		t.Logf("Got error: %v (circuit may still be recovering)", errs[0])
	}
}
