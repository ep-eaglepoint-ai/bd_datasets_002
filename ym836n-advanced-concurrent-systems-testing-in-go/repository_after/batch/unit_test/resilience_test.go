package unit_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// 5. Timeouts
func TestPerItemTimeouts(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	// Item takes 2s to download
	dl.delays[1] = 2 * time.Second

	opts := batch.ProcessOptions{
		TimeoutPerItem: 1 * time.Second,
		MinWorkers:     1, MaxWorkers: 1,
	}

	go func() {
		time.Sleep(10 * time.Millisecond)
		clk.Advance(1500 * time.Millisecond)
	}()

	_, errs := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, nil)

	if !errors.Is(errs[0], context.DeadlineExceeded) {
		t.Errorf("Expected DeadlineExceeded, got %v", errs[0])
	}
}

// 7. Retry
func TestRetryBehavior(t *testing.T) {
	clk := NewMockClock()
	rnd := &MockRand{val: 0}

	// Use direct error injection that will ONLY succeed on 3rd call
	attemptCount := 0

	// Create custom downloader that tracks attempts
	customDL := &DynamicDownloader{
		MockDownloader: NewMockDownloader(clk, rnd),
		OnDownload: func(id int) (string, error) {
			attemptCount++

			// Critical: Only succeed on exactly the 3rd attempt
			// If retries are broken, we only get 1 attempt and test MUST fail
			if attemptCount == 3 {
				return "retry-success", nil
			}
			return "", errors.New("intentional failure")
		},
	}

	// Advance clock for backoff delays
	go func() {
		for i := 0; i < 10; i++ {
			time.Sleep(10 * time.Millisecond)
			clk.Advance(100 * time.Millisecond)
		}
	}()

	results, errs := batch.ProcessParallelOptimized(
		context.Background(),
		[]int{1},
		customDL,
		batch.ProcessOptions{
			Retries:    2,
			MinWorkers: 1,
			MaxWorkers: 1,
		},
		nil,
	)

	// MUST have exactly 3 attempts (initial + 2 retries)
	if attemptCount != 3 {
		t.Fatalf("Expected exactly 3 attempts, got %d - retry logic is broken", attemptCount)
	}

	// MUST succeed (only happens on 3rd attempt)
	if results[0] != "retry-success" {
		t.Errorf("Expected 'retry-success', got %q", results[0])
	}

	// MUST have no error
	if errs[0] != nil {
		t.Errorf("Expected no error after successful retry, got %v", errs[0])
	}
}

// 10. Circuit Breaker
func TestCircuitBreaker(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	dl.errs[1] = errors.New("fail")

	ids := []int{1, 1, 1, 2}
	opts := batch.ProcessOptions{
		EnableCircuitBreaker: true,
		CircuitThreshold:     2,
		CircuitBuckets:       1,
		CircuitCoolDown:      1 * time.Second,
		MinWorkers:           1, MaxWorkers: 1,
		Retries: 0,
	}

	_, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if !errors.Is(errs[2], batch.ErrCircuitOpen) {
		t.Errorf("Idx 2 expected ErrCircuitOpen, got %v", errs[2])
	}
	if !errors.Is(errs[3], batch.ErrCircuitOpen) {
		t.Errorf("Idx 3 expected ErrCircuitOpen, got %v", errs[3])
	}
}
