package dblock_test

import (
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_NewHelperCreatesInstance(t *testing.T) {
	helper := dblock.NewDatabaseLockHelper(nil, "test-lock")
	if helper == nil {
		t.Fatal("Expected non-nil helper")
	}
}
