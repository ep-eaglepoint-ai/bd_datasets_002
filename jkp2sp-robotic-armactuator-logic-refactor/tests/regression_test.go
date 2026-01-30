package actuators_test

import (
	"sync"
	"testing"

	"jkp2sp-robotic-armactuator-logic-refactor/actuators"
)

//////////////////////////////////////////////////////////////////////////////
// REGRESSION TESTS (PASS ON BOTH before AND after)
//////////////////////////////////////////////////////////////////////////////

func TestMalformedBufferReturnsError(t *testing.T) {
	shortBuffer := []byte{0x01, 0x02, 0x03}
	err := actuators.ProcessMoveCommand(shortBuffer, "mm")
	if err == nil {
		t.Fatal("Expected error for malformed buffer, got nil")
	}
}

func TestInchesToMMCalculation(t *testing.T) {
	// Use CommandProcessor directly to access state
	processor := actuators.DefaultCommandProcessor()

	// Test: 5 inches should convert to 127mm (5 * 25.4 = 127)
	err := processor.ProcessMoveCommand(uint64ToBytes(5), "inches")
	if err != nil {
		t.Fatalf("Unexpected error for inches command: %v", err)
	}

	// Verify the actual converted value stored in state
	pos := processor.GetCurrentPosition()
	if pos != 127.0 {
		t.Fatalf("Expected position to be 127mm (5 inches converted), got: %f", pos)
	}

	// Test: 127mm should be accepted (exactly at boundary)
	err = processor.ProcessMoveCommand(uint64ToBytes(127), "mm")
	if err != nil {
		t.Fatalf("127 mm should be accepted, got error: %v", err)
	}

	// Verify position updated to 127mm
	pos = processor.GetCurrentPosition()
	if pos != 127.0 {
		t.Fatalf("Expected position to be 127mm, got: %f", pos)
	}
}

func TestSafetyThresholdViolation(t *testing.T) {
	err := actuators.ProcessMoveCommand(uint64ToBytes(200), "mm")
	if err == nil {
		t.Fatal("Expected error for out-of-bounds command, got nil")
	}
}

func TestStateNotCorruptedAfterRejectedMove(t *testing.T) {
	// Reset processor to ensure clean state
	actuators.ResetProcessor()

	// First valid command should succeed
	err := actuators.ProcessMoveCommand(uint64ToBytes(50), "mm")
	if err != nil {
		t.Fatalf("First valid command should succeed, got: %v", err)
	}

	// Verify state was updated
	pos := actuators.GetCurrentPosition()
	if pos != 50 {
		t.Fatalf("Expected position 50, got: %f", pos)
	}

	// Second command should be rejected (out of bounds)
	err = actuators.ProcessMoveCommand(uint64ToBytes(300), "mm")
	if err == nil {
		t.Fatal("Expected rejection for out-of-bounds command")
	}

	// Verify state was NOT corrupted (should still be 50)
	pos = actuators.GetCurrentPosition()
	if pos != 50 {
		t.Fatalf("State corrupted after rejected move: expected 50, got: %f", pos)
	}

	// Third valid command should succeed and update state
	err = actuators.ProcessMoveCommand(uint64ToBytes(60), "mm")
	if err != nil {
		t.Fatalf("Valid command after rejection should succeed, got: %v", err)
	}

	// Verify state was updated to new position
	pos = actuators.GetCurrentPosition()
	if pos != 60 {
		t.Fatalf("Expected position 60, got: %f", pos)
	}
}

func TestThreadSafeStateAccess(t *testing.T) {
	var wg sync.WaitGroup
	iterations := 100
	for i := 0; i < iterations; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = actuators.ProcessMoveCommand(uint64ToBytes(10), "mm")
		}()
	}
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = actuators.ProcessMoveCommand(uint64ToBytes(100), "mm")
	}()
	wg.Wait()
	err := actuators.ProcessMoveCommand(uint64ToBytes(120), "mm")
	if err != nil {
		t.Fatalf("Final deterministic command failed: %v", err)
	}
}

func TestProtocolDecoding(t *testing.T) {
	err := actuators.ProcessMoveCommand(uint64ToBytes(100), "mm")
	if err != nil {
		t.Fatalf("Valid command should not fail: %v", err)
	}
}
