package unit_test

import (
	"context"
	"errors"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// 8. Cache
func TestCacheCorrectness(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})

	ids := []int{1, 1}
	blocker := make(chan struct{})
	dl.blockers[1] = blocker

	go func() {
		close(blocker)
	}()

	opts := batch.ProcessOptions{
		EnableCache: true, CacheTTL: 10 * time.Second,
		MinWorkers: 1, MaxWorkers: 1,
	}

	batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if dl.calls[1] != 1 {
		t.Errorf("Expected 1 call (cache hit), got %d", dl.calls[1])
	}

	dl2 := NewMockDownloader(clk, &MockRand{})
	dl2.responses[1] = "val"

	wrapper2 := &DynamicDownloader{
		MockDownloader: dl2,
		OnDownload: func(id int) (string, error) {
			if id == 2 {
				clk.Advance(11 * time.Second)
				return "val2", nil
			}
			return "val1", nil
		},
	}

	batch.ProcessParallelOptimized(context.Background(), []int{1, 2, 1}, wrapper2, opts, nil)

	if dl2.calls[1] != 2 {
		t.Errorf("Expected 2 calls for ID 1 due to TTL, got %d", dl2.calls[1])
	}
}

// 9. Coalescing
func TestRequestCoalescing(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	dl.blockers[1] = make(chan struct{})

	go func() {
		time.Sleep(50 * time.Millisecond)
		close(dl.blockers[1])
	}()

	batch.ProcessParallelOptimized(context.Background(), []int{1, 1, 1}, dl, batch.ProcessOptions{EnableCoalesce: true, MinWorkers: 3, MaxWorkers: 3}, nil)
	if dl.calls[1] != 1 {
		t.Errorf("Expected 1 call, got %d", dl.calls[1])
	}
}

// 11. Rate Limit
func TestGlobalRateLimit(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	dl.delays[1] = 1 * time.Second

	go func() {
		time.Sleep(10 * time.Millisecond)
		clk.Advance(2 * time.Second)
	}()

	_, errs := batch.ProcessParallelOptimized(context.Background(), []int{1, 2}, dl, batch.ProcessOptions{GlobalRateLimit: 1, MinWorkers: 2, MaxWorkers: 2}, nil)

	fails := 0
	for _, e := range errs {
		if errors.Is(e, batch.ErrRateLimited) {
			fails++
		}
	}
	if fails != 1 {
		t.Errorf("Expected 1 RateLimit, got %d", fails)
	}
}

// 12. PostProcess
func TestPostProcessing(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	dl.responses[1] = "raw"
	res, _ := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, batch.ProcessOptions{PostProcess: true, MinWorkers: 1, MaxWorkers: 1}, nil)
	if !strings.HasPrefix(res[0], "raw:") {
		t.Error("PostProcess failed")
	}
}

// 13. Hooks
func TestHookInvocation(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	var calls int32
	hooks := &batch.ProcessHooks{OnItem: func(id, att int, err error) { atomic.AddInt32(&calls, 1) }}
	batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, batch.ProcessOptions{MinWorkers: 1, MaxWorkers: 1}, hooks)
	if calls != 1 {
		t.Error("Hook failed")
	}
}
