package dblock_test

import (
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_EmptyLockName(t *testing.T) {
	helper := dblock.NewDatabaseLockHelper(nil, "")
	if helper == nil {
		t.Fatal("Empty lock name should work")
	}
}
