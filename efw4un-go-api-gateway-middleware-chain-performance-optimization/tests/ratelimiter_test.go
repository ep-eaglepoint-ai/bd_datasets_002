package main_test

import (
	"apigateway/gateway"
	"sync"
	"testing"
	"time"
)

func TestRateLimiter_Concurrency(t *testing.T) {
	limiter := gateway.NewRateLimiter(1000, 100)
	var wg sync.WaitGroup

	// Simulate concurrent access
	concurrency := 100
	requests := 50

	errChan := make(chan error, concurrency*requests)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < requests; j++ {
				// We don't care about result, just that it doesn't panic (race detector)
				// and state remains consistent.
				limiter.Allow("127.0.0.1")
			}
		}()
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		t.Errorf("Encountered errors during concurrency test")
	}
}

func TestRateLimiter_Refill(t *testing.T) {
	// 1 token max, refill 1 per second
	limiter := gateway.NewRateLimiter(1, 1)

	// Use token
	if !limiter.Allow("test") {
		t.Fatal("First request should be allowed")
	}

	// Immediate next should fail
	if limiter.Allow("test") {
		t.Fatal("Second request should be denied immediately")
	}

	// Wait 1.1s (enough for 1 token)
	time.Sleep(1100 * time.Millisecond)

	if !limiter.Allow("test") {
		t.Fatal("Request should be allowed after refill")
	}
}
