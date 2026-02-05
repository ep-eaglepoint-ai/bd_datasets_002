package unit_test

import (
	"context"
	"testing"
	"time"

	"example.com/batch-optimized"
)

// 1. Deterministic
func TestProcessParallelOptimized_Deterministic(t *testing.T) {
	clk := NewMockClock()
	rnd := &MockRand{val: 0}
	dl := NewMockDownloader(clk, rnd)

	ids := []int{1, 2, 3}
	opts := batch.ProcessOptions{MinWorkers: 1, MaxWorkers: 1}

	results, errs := batch.ProcessParallelOptimized(context.Background(), ids, dl, opts, nil)

	if len(results) != 3 {
		t.Fatalf("expected 3 results")
	}
	if results[0] != "default_1" {
		t.Errorf("got %s", results[0])
	}
	if errs[0] != nil {
		t.Errorf("err %v", errs[0])
	}
}

// 2. Order
func TestInputOrderPreservation(t *testing.T) {
	clk := NewMockClock()
	dl := NewMockDownloader(clk, &MockRand{})
	dl.delays[1] = 100 * time.Millisecond

	go func() {
		time.Sleep(10 * time.Millisecond)
		clk.Advance(200 * time.Millisecond)
	}()

	results, _ := batch.ProcessParallelOptimized(context.Background(), []int{1, 2}, dl, batch.ProcessOptions{MinWorkers: 2, MaxWorkers: 2}, nil)
	if results[0] != "default_1" || results[1] != "default_2" {
		t.Error("Order mismatch")
	}
}
