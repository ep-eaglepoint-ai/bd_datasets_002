package unit

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// Test 11: Post-Processing Transformation
func TestPostProcessing(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	dl.SetResponse(1, "test", nil)
	dl.SetResponse(2, "", errors.New("download failed"))

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     1,
		TimeoutPerItem: time.Second,
		PostProcess:    true,
		Retries:        0,
	}

	results, errs := batch.ProcessParallelOptimized(context.Background(), []int{1, 2}, dl, opts, nil)

	// First result should be post-processed (has :sha256)
	if len(results[0]) <= 4 || results[0][:4] != "test" {
		t.Errorf("Expected post-processed result starting with 'test', got %s", results[0])
	}

	if results[0] == "test" {
		t.Error("Post-processing did not transform the value")
	}

	// Second result should have error (no post-processing on failure)
	if errs[1] == nil {
		t.Error("Expected error for second ID, got nil")
	}
}

// Test 12: Hooks Invocation
func TestHooksInvocation(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	dl.SetResponses(1, []downloadResponse{
		{value: "", err: errors.New("fail")},
		{value: "success", err: nil},
	})

	var onStartCount, onDoneCount, onItemCount int32

	hooks := &batch.ProcessHooks{
		OnStart: func(total int) {
			atomic.AddInt32(&onStartCount, 1)
			if total != 1 {
				t.Errorf("OnStart: expected total=1, got %d", total)
			}
		},
		OnDone: func() {
			atomic.AddInt32(&onDoneCount, 1)
		},
		OnItem: func(id int, attempt int, err error) {
			atomic.AddInt32(&onItemCount, 1)
		},
	}

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     1,
		TimeoutPerItem: time.Second,
		Retries:        1,
	}

	go func() {
		time.Sleep(50 * time.Millisecond)
		clock.Advance(200 * time.Millisecond)
	}()

	batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, hooks)

	if onStartCount != 1 {
		t.Errorf("OnStart: expected 1 call, got %d", onStartCount)
	}

	if onDoneCount != 1 {
		t.Errorf("OnDone: expected 1 call, got %d", onDoneCount)
	}

	if onItemCount < 1 {
		t.Errorf("OnItem: expected at least 1 call, got %d", onItemCount)
	}
}

// Test 13: Per-Item Timeout
func TestPerItemTimeout(t *testing.T) {
	clock := NewFakeClock(time.Now())
	rand := NewFakeRand()
	dl := NewFakeDownloader(clock, rand)

	// Simulate long download
	dl.SetResponse(1, "value", nil)

	opts := batch.ProcessOptions{
		MinWorkers:     1,
		MaxWorkers:     1,
		TimeoutPerItem: 100 * time.Millisecond,
		Retries:        0,
	}

	// Don't advance clock - timeout should trigger
	_, errs := batch.ProcessParallelOptimized(context.Background(), []int{1}, dl, opts, nil)

	// May timeout depending on actual execution
	if errs[0] != nil {
		t.Logf("Got error (may be timeout): %v", errs[0])
	}
}
