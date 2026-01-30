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
	err := actuators.ProcessMoveCommand(uint64ToBytes(5), "inches")
	if err != nil {
		t.Fatalf("Unexpected error for inches command: %v", err)
	}
	err = actuators.ProcessMoveCommand(uint64ToBytes(127), "mm")
	if err != nil {
		t.Fatalf("127 mm should be accepted, got error: %v", err)
	}
}

func TestSafetyThresholdViolation(t *testing.T) {
	err := actuators.ProcessMoveCommand(uint64ToBytes(200), "mm")
	if err == nil {
		t.Fatal("Expected error for out-of-bounds command, got nil")
	}
}

func TestStateNotCorruptedAfterRejectedMove(t *testing.T) {
	_ = actuators.ProcessMoveCommand(uint64ToBytes(50), "mm")
	err := actuators.ProcessMoveCommand(uint64ToBytes(300), "mm")
	if err == nil {
		t.Fatal("Expected rejection for out-of-bounds command")
	}
	err = actuators.ProcessMoveCommand(uint64ToBytes(60), "mm")
	if err != nil {
		t.Fatalf("Valid command after rejection should succeed, got: %v", err)
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
