package tests

import (
	"testing"
	claimsdeduplication "claims-deduplication"
)

func TestImport(t *testing.T) {
	// Just test that we can import the module
	_ = claimsdeduplication.NewClaimsDeduplicator(nil)
	t.Log("Import successful")
}
