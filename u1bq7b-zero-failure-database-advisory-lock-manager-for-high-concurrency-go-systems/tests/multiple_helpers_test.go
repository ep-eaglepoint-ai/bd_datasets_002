package dblock_test

import (
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_MultipleHelpersCreated(t *testing.T) {
	helper1 := dblock.NewDatabaseLockHelper(nil, "lock-a")
	helper2 := dblock.NewDatabaseLockHelper(nil, "lock-b")

	if helper1 == nil || helper2 == nil {
		t.Fatal("Failed to create multiple helpers")
	}
}
