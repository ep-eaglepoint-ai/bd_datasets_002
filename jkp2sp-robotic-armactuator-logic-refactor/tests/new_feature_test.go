//go:build after
// +build after

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

func TestMockSafetyMonitorPreventsStateMutation(t *testing.T) {
	processor := actuators.DefaultCommandProcessor()
	setMockSafetyMonitor(processor, false)
	err := processor.ProcessMoveCommand(uint64ToBytes(50), "mm")
	if err == nil {
		t.Fatal("Expected rejection from mock safety monitor")
	}

	pos := processor.GetCurrentPosition()
	if pos != 0 {
		t.Fatalf("State mutated despite safety rejection: got %f", pos)
	}
}

func TestCustomErrorTypesReturned(t *testing.T) {
	processor := actuators.DefaultCommandProcessor()
	setMockSafetyMonitor(processor, false)
	err := processor.ProcessMoveCommand(uint64ToBytes(50), "mm")
	if err == nil {
		t.Fatal("Expected safety error")
	}

	if !actuators.IsSafetyThresholdError(err) {
		t.Fatalf("Expected SafetyThresholdError, got: %T", err)
	}
}

func TestMalformedBufferShortCircuitsSafety(t *testing.T) {
	processor := actuators.DefaultCommandProcessor()
	setMockSafetyMonitor(processor, true) // Panic if called
	err := processor.ProcessMoveCommand([]byte{0x01, 0x02}, "mm")
	if err == nil {
		t.Fatal("Expected protocol error for malformed buffer")
	}
}

//////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
//////////////////////////////////////////////////////////////////////////////

type mockSafetyMonitor struct {
	allow bool
}

func (m *mockSafetyMonitor) ValidateCommand(targetMM float64) error {
	if m.allow {
		return nil
	}
	return &actuators.SafetyThresholdError{
		TargetValue: targetMM,
		MaxBound:    150.0,
	}
}

func setMockSafetyMonitor(processor *actuators.CommandProcessor, allow bool) {
	mock := &mockSafetyMonitor{allow: allow}
	processor.SetSafetyMonitor(mock)
}
