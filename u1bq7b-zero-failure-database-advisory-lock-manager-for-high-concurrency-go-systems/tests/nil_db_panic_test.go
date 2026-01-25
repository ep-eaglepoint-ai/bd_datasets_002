package dblock_test

import (
	"context"
	"testing"
	"time"

	"dblock-demo/dblock"
)

func TestBug1_NilDBDoesNotPanic(t *testing.T) {
	helper := dblock.NewDatabaseLockHelper(nil, "test-lock")

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	panicked := false
	func() {
		defer func() {
			if r := recover(); r != nil {
				panicked = true
			}
		}()
		_ = helper.AcquireLock(ctx, 0)
	}()

	if panicked {
		t.Fatal("AcquireLock panicked with nil db - BUG: should return error instead")
	}
}
