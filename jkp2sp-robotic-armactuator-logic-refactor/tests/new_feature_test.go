package actuators_test

import (
	"testing"

	"jkp2sp-robotic-armactuator-logic-refactor/actuators"
)

//////////////////////////////////////////////////////////////////////////////
// NEW FEATURE TESTS (FAIL ON before, PASS ON after)
//////////////////////////////////////////////////////////////////////////////

func TestUnsupportedUnitReturnsProtocolError(t *testing.T) {
	err := actuators.ProcessMoveCommand(uint64ToBytes(10), "yards")
	if err == nil {
		t.Fatal("Expected error for unsupported unit")
	}
}
