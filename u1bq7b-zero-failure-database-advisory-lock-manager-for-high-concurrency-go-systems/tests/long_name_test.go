package dblock_test

import (
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_LongLockName(t *testing.T) {
	longName := ""
	for i := 0; i < 1000; i++ {
		longName += "x"
	}
	helper := dblock.NewDatabaseLockHelper(nil, longName)
	if helper == nil {
		t.Fatal("Long lock name should work")
	}
}
