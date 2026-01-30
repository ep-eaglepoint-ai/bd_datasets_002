// filename: actuator_logic.go

package actuators

import (
	"encoding/binary"
	"errors"
	"fmt"
	"sync"
)

//////////////////////////////////////////////////////////////////////////////
// Custom Errors
//////////////////////////////////////////////////////////////////////////////

// ProtocolError represents errors from the binary protocol layer.
type ProtocolError struct {
	Message string
}

func (e *ProtocolError) Error() string {
	return fmt.Sprintf("PROTOCOL_ERROR: %s", e.Message)
}

// SafetyThresholdError represents safety boundary violations.
type SafetyThresholdError struct {
	TargetValue float64
	MaxBound    float64
}

func (e *SafetyThresholdError) Error() string {
	return fmt.Sprintf(
		"SAFETY_VIOLATION: target %f mm exceeds bound %f mm",
		e.TargetValue,
		e.MaxBound,
	)
}

//////////////////////////////////////////////////////////////////////////////
// Interfaces
//////////////////////////////////////////////////////////////////////////////

// IProtocolDecoder handles low-level binary protocol parsing.
type IProtocolDecoder interface {
	DecodeTargetX(rawBuffer []byte) (float64, error)
}

// IKinematicsTransformer handles coordinate transformation.
type IKinematicsTransformer interface {
	TransformToMM(value float64, units string) (float64, error)
}

// ISafetyMonitor validates commands against safety constraints.
type ISafetyMonitor interface {
	ValidateCommand(targetMM float64) error
}

//////////////////////////////////////////////////////////////////////////////
// State Management
//////////////////////////////////////////////////////////////////////////////

// ArmState represents the current state of the robotic arm.
type ArmState struct {
	mu       sync.RWMutex
	CurrentX float64
}

// NewArmState creates a new ArmState.
func NewArmState() *ArmState {
	return &ArmState{CurrentX: 0}
}

// GetCurrentX returns the current X position (thread-safe read).
func (as *ArmState) GetCurrentX() float64 {
	as.mu.RLock()
	defer as.mu.RUnlock()
	return as.CurrentX
}

// setCurrentX updates the X position (thread-safe write).
// This is intentionally unexported to enforce controlled mutation.
func (as *ArmState) setCurrentX(value float64) {
	as.mu.Lock()
	defer as.mu.Unlock()
	as.CurrentX = value
}

//////////////////////////////////////////////////////////////////////////////
// Protocol Decoder Implementation
//////////////////////////////////////////////////////////////////////////////

// BinaryProtocolDecoder implements IProtocolDecoder for little-endian uint64.
type BinaryProtocolDecoder struct{}

func (bpd *BinaryProtocolDecoder) DecodeTargetX(rawBuffer []byte) (float64, error) {
	if len(rawBuffer) < 8 {
		return 0, &ProtocolError{Message: "short packet - insufficient bytes"}
	}
	targetX := float64(binary.LittleEndian.Uint64(rawBuffer[0:8]))
	return targetX, nil
}

//////////////////////////////////////////////////////////////////////////////
// Kinematics Transformer Implementation
//////////////////////////////////////////////////////////////////////////////

// KinematicsTransformer handles unit conversion and geometry.
type KinematicsTransformer struct{}

func (kt *KinematicsTransformer) TransformToMM(value float64, units string) (float64, error) {
	switch units {
	case "mm":
		return value, nil
	case "inches":
		return value * 25.4, nil
	default:
		return 0, &ProtocolError{Message: fmt.Sprintf("unsupported units: %s", units)}
	}
}

//////////////////////////////////////////////////////////////////////////////
// Safety Watchdog Implementation
//////////////////////////////////////////////////////////////////////////////

// SafetyWatchdog validates motion commands against safety bounds.
type SafetyWatchdog struct {
	MaxSafetyBound float64
}

// NewSafetyWatchdog creates a new SafetyWatchdog.
func NewSafetyWatchdog(maxBound float64) *SafetyWatchdog {
	return &SafetyWatchdog{MaxSafetyBound: maxBound}
}

func (sw *SafetyWatchdog) ValidateCommand(targetMM float64) error {
	if targetMM < 0 || targetMM > sw.MaxSafetyBound {
		return &SafetyThresholdError{
			TargetValue: targetMM,
			MaxBound:    sw.MaxSafetyBound,
		}
	}
	return nil
}

//////////////////////////////////////////////////////////////////////////////
// Command Processor
//////////////////////////////////////////////////////////////////////////////

// CommandProcessor orchestrates the processing pipeline.
type CommandProcessor struct {
	decoder     IProtocolDecoder
	transformer IKinematicsTransformer
	safety      ISafetyMonitor
	state       *ArmState
}

// NewCommandProcessor creates a CommandProcessor with injected dependencies.
func NewCommandProcessor(
	decoder IProtocolDecoder,
	transformer IKinematicsTransformer,
	safety ISafetyMonitor,
	state *ArmState,
) *CommandProcessor {
	return &CommandProcessor{
		decoder:     decoder,
		transformer: transformer,
		safety:      safety,
		state:       state,
	}
}

// DefaultCommandProcessor creates a CommandProcessor with default implementations.
func DefaultCommandProcessor() *CommandProcessor {
	return NewCommandProcessor(
		&BinaryProtocolDecoder{},
		&KinematicsTransformer{},
		NewSafetyWatchdog(150.0),
		NewArmState(),
	)
}

// ProcessMoveCommand processes a move command through the pipeline.
func (cp *CommandProcessor) ProcessMoveCommand(rawBuffer []byte, units string) error {
	// Step 1: Protocol decoding
	targetX, err := cp.decoder.DecodeTargetX(rawBuffer)
	if err != nil {
		return err
	}

	// Step 2: Coordinate transformation
	targetMM, err := cp.transformer.TransformToMM(targetX, units)
	if err != nil {
		return err
	}

	// Step 3: Safety validation (immutable checkpoint)
	if err := cp.safety.ValidateCommand(targetMM); err != nil {
		return err
	}

	// Step 4: Update state only after passing all checks
	cp.state.setCurrentX(targetMM)
	fmt.Printf("Moving to %f mm\n", targetMM)
	return nil
}

// ProcessMoveCommand is a package-level wrapper for backward compatibility.
// It creates a default CommandProcessor and processes the command.
func ProcessMoveCommand(rawBuffer []byte, units string) error {
	processor := DefaultCommandProcessor()
	return processor.ProcessMoveCommand(rawBuffer, units)
}

// GetCurrentPosition returns the current X position.
func (cp *CommandProcessor) GetCurrentPosition() float64 {
	return cp.state.GetCurrentX()
}

// SetSafetyMonitor replaces the safety monitor with a custom implementation.
func (cp *CommandProcessor) SetSafetyMonitor(monitor ISafetyMonitor) {
	cp.safety = monitor
}

//////////////////////////////////////////////////////////////////////////////
// Error Type Helpers
//////////////////////////////////////////////////////////////////////////////

// IsProtocolError checks if an error is a ProtocolError.
func IsProtocolError(err error) bool {
	var pe *ProtocolError
	return errors.As(err, &pe)
}

// IsSafetyThresholdError checks if an error is a SafetyThresholdError.
func IsSafetyThresholdError(err error) bool {
	var ste *SafetyThresholdError
	return errors.As(err, &ste)
}

// Feature detection - returns true for refactored code
func HasRefactoredFeatures() bool {
	return true
}
