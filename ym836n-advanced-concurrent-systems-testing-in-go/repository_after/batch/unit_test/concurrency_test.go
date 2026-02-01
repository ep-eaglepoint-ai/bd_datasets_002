package unit_test

import (
	"context"
	"runtime"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// 3. Concurrency
func TestConcurrencyLimits(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	blocker := make(chan struct{})
	for i := 0; i < 10; i++ {
		dl.blockers[i] = blocker
	}

	opts := batch.ProcessOptions{MinWorkers: 3, MaxWorkers: 3}
	go func() {
		time.Sleep(50 * time.Millisecond)
		close(blocker)
	}()

	batch.ProcessParallelOptimized(context.Background(), []int{0, 1, 2, 3, 4}, dl, opts, nil)
	dl.mu.Lock()
	max := dl.maxActiveCalls
	dl.mu.Unlock()
	if max != 3 {
		t.Errorf("Expected max 3, got %d", max)
	}
}

// 4. Scaling
func TestDynamicWorkerScaling(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	blocker := make(chan struct{})

	count := 20
	ids := make([]int, count)
	for i := 0; i < count; i++ {
		ids[i] = i
		dl.blockers[i] = blocker
	}

	opts := batch.ProcessOptions{
		MinWorkers: 1, MaxWorkers: 5, TargetQueuePerWorker: 1,
	}

	go func() {
		for i := 0; i < 10; i++ {
			time.Sleep(10 * time.Millisecond)
			clk.Advance(20 * time.Millisecond)
		}
		close(blocker)
	}()

	batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	dl.mu.Lock()
	max := dl.maxActiveCalls
	dl.mu.Unlock()
	if max < 5 {
		t.Errorf("Expected scaling to 5, got %d", max)
	}
}

// 14. Stress
func TestStress(t *testing.T) {
	initial := runtime.NumGoroutine()
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})

	batch.ProcessParallelOptimized(context.Background(), make([]int, 100), dl, batch.ProcessOptions{MinWorkers: 10, MaxWorkers: 50}, nil)

	time.Sleep(50 * time.Millisecond)
	if runtime.NumGoroutine() > initial+5 {
		t.Error("Goroutine leak")
	}
}
