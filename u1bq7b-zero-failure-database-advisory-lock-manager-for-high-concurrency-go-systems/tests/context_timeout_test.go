package dblock_test

import (
	"context"
	"testing"
	"time"

	"dblock-demo/dblock"
)

func TestBug2_ContextTimeoutCheckedBeforeWork(t *testing.T) {
	helper := dblock.NewDatabaseLockHelper(nil, "test-lock")

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()
	time.Sleep(5 * time.Millisecond)

	start := time.Now()
	panicked := false
	var err error
	
	func() {
		defer func() {
			if r := recover(); r != nil {
				panicked = true
			}
		}()
		err = helper.AcquireLock(ctx, 0)
	}()
	
	duration := time.Since(start)

	if panicked {
		t.Fatal("Panicked instead of checking context - BUG")
	}
	if err == nil {
		t.Log("No error returned with timed out context")
	}
	if duration > 50*time.Millisecond {
		t.Logf("Took too long (%v) - context should be checked early", duration)
	}
}
