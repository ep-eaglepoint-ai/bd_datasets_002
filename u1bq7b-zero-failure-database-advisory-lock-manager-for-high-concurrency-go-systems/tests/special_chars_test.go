package dblock_test

import (
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_SpecialCharacterLockNames(t *testing.T) {
	names := []string{
		"with spaces",
		"with/slash",
		"with:colon",
		"emoji🔒",
		"日本語",
	}

	for _, name := range names {
		helper := dblock.NewDatabaseLockHelper(nil, name)
		if helper == nil {
			t.Errorf("Failed with special name: %q", name)
		}
	}
}
