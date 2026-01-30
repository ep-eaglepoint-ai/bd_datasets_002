// filename: actuator_logic.go

package actuators

import (
	"encoding/binary"
	"fmt"
	"sync"
)

// PROBLEM: Global variables make testing concurrent robotic calls impossible
var (
	mu             sync.Mutex
	CurrentX       float64
	MaxSafetyBound float64 = 150.0 // mm
)

// Feature detection - returns false for legacy code
func HasRefactoredFeatures() bool {
	return false
}

// Stub types for backward compatibility with test file
// These allow the test file to compile against both before and after

// ProtocolError stub
type ProtocolError struct {
	Message string
}

func (e *ProtocolError) Error() string {
	return fmt.Sprintf("PROTOCOL_ERROR: %s", e.Message)
}

// SafetyThresholdError stub
type SafetyThresholdError struct {
	TargetValue float64
	MaxBound    float64
}

func (e *SafetyThresholdError) Error() string {
	return fmt.Sprintf("SAFETY_VIOLATION: target %f mm exceeds bound %f mm", e.TargetValue, e.MaxBound)
}

// ISafetyMonitor stub interface
type ISafetyMonitor interface {
	ValidateCommand(targetMM float64) error
}

// CommandProcessor stub (non-functional in before)
type CommandProcessor struct{}

// DefaultCommandProcessor stub - returns nil in before
func DefaultCommandProcessor() *CommandProcessor {
	return nil
}

// ProcessMoveCommand method stub
func (cp *CommandProcessor) ProcessMoveCommand(rawBuffer []byte, units string) error {
	return nil
}

// GetCurrentPosition stub
func (cp *CommandProcessor) GetCurrentPosition() float64 {
	return 0
}

// SetSafetyMonitor stub
func (cp *CommandProcessor) SetSafetyMonitor(monitor ISafetyMonitor) {}

// IsProtocolError stub
func IsProtocolError(err error) bool {
	return false
}

// IsSafetyThresholdError stub
func IsSafetyThresholdError(err error) bool {
	return false
}

/**
 * ProcessMoveCommand is the primary logic bottleneck.
 * It mixes low-level binary decoding with critical safety geometry.
 */
func ProcessMoveCommand(rawBuffer []byte, units string) error {
	mu.Lock()
	defer mu.Unlock()

	// Low-level parsing mixed with logic
	if len(rawBuffer) < 8 {
		return fmt.Errorf("short packet")
	}
	targetX := float64(binary.LittleEndian.Uint64(rawBuffer[0:8]))

	// Units conversion logic embedded in safety check
	actualDistance := targetX
	if units == "inches" {
		actualDistance = targetX * 25.4
	}

	// CRITICAL SAFETY CHECK: Brittle and tightly coupled
	if actualDistance > MaxSafetyBound || actualDistance < 0 {
		return fmt.Errorf("SAFETY_VIOLATION: target out of bounds: %f", actualDistance)
	}

	// Side Effect: Hardware interaction via direct assignment
	fmt.Printf("Moving to %f mm\n", actualDistance)
	CurrentX = actualDistance
	return nil
}
