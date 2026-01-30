//go:build after

package actuators_test

import (
	"testing"

	"jkp2sp-robotic-armactuator-logic-refactor/actuators"
)

//////////////////////////////////////////////////////////////////////////////
// REFACTORED FEATURE TESTS (only compile for repository_after)
//////////////////////////////////////////////////////////////////////////////

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
	// Create a tracking mock that records which methods were called
	trackingMonitor := &trackingMockSafetyMonitor{called: false}
	processor := actuators.DefaultCommandProcessor()
	processor.SetSafetyMonitor(trackingMonitor)

	// Use a malformed buffer (only 2 bytes, need 8)
	err := processor.ProcessMoveCommand([]byte{0x01, 0x02}, "mm")
	if err == nil {
		t.Fatal("Expected protocol error for malformed buffer")
	}

	// Verify it's a protocol error, not a safety error
	if !actuators.IsProtocolError(err) {
		t.Fatalf("Expected ProtocolError, got: %T", err)
	}

	// Verify that transformation and safety were NOT called
	// If they were called, trackingMonitor would have panicked (set to true)
	// and we would have caught it in the error check above
	// This is implicit but we make it explicit here:
	if trackingMonitor.called {
		t.Fatal("Safety monitor was called despite malformed buffer - transformation/safety should short-circuit")
	}
}

//////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
//////////////////////////////////////////////////////////////////////////////

// mockSafetyMonitor returns an error when allow is false
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

// trackingMockSafetyMonitor tracks if ValidateCommand was called
type trackingMockSafetyMonitor struct {
	called bool
}

func (m *trackingMockSafetyMonitor) ValidateCommand(targetMM float64) error {
	m.called = true
	return nil
}

func setMockSafetyMonitor(processor *actuators.CommandProcessor, allow bool) {
	mock := &mockSafetyMonitor{allow: allow}
	processor.SetSafetyMonitor(mock)
}
