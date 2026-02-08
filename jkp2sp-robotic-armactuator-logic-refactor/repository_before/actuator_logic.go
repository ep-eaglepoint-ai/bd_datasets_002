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
