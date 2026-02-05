package tests

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"skydeliver/deconfliction"
)

func TestConvergence(t *testing.T) {
	d1 := deconfliction.Drone{
		ID:       "D1",
		Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10},
		Velocity: deconfliction.Vector3{X: 0.5, Y: 0, Z: 0},
		Battery:  80,
	}
	d2 := deconfliction.Drone{
		ID:       "D2",
		Position: deconfliction.Vector3{X: 10, Y: 0, Z: 10},
		Velocity: deconfliction.Vector3{X: -0.5, Y: 0, Z: 0},
		Battery:  90,
	}

	drones := []deconfliction.Drone{d1, d2}
	instructions := deconfliction.ResolveConflicts(drones)

	instMap := make(map[string]deconfliction.Instruction)
	for _, inst := range instructions {
		instMap[inst.DroneID] = inst
	}

	if instMap["D1"].Action != deconfliction.Maintain {
		t.Errorf("Expected D1 to MAINTAIN, got %v", instMap["D1"].Action)
	}

	if instMap["D2"].Action != deconfliction.AdjustAltitude {
		t.Errorf("Expected D2 to ADJUST_ALTITUDE, got %v", instMap["D2"].Action)
	}

	z := instMap["D2"].Value
	if z != 8.0 && z != 12.0 {
		t.Errorf("Expected D2 Z to be 8.0 or 12.0, got %f", z)
	}
}

func TestStressPerformance(t *testing.T) {
	numDrones := 100
	drones := make([]deconfliction.Drone, numDrones)
	rnd := rand.New(rand.NewSource(42))

	for i := 0; i < numDrones; i++ {
		drones[i] = deconfliction.Drone{
			ID: fmt.Sprintf("D%d", i),
			Position: deconfliction.Vector3{
				X: rnd.Float64() * 100,
				Y: rnd.Float64() * 100,
				Z: 10 + rnd.Float64()*5,
			},
			Velocity: deconfliction.Vector3{
				X: (rnd.Float64() - 0.5) * 5,
				Y: (rnd.Float64() - 0.5) * 5,
				Z: 0,
			},
			Battery: rnd.Intn(100),
		}
	}

	start := time.Now()

	_ = deconfliction.ResolveConflicts(drones)

	duration := time.Since(start)
	if duration > 20*time.Millisecond {
		t.Errorf("ResolveConflicts took too long: %v (limit 20ms)", duration)
	} else {
		t.Logf("ResolveConflicts took %v", duration)
	}
}

func TestCascading(t *testing.T) {

	d1 := deconfliction.Drone{ID: "D1", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 10}
	d2 := deconfliction.Drone{ID: "D2", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 20}
	d3 := deconfliction.Drone{ID: "D3", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 30}

	drones := []deconfliction.Drone{d1, d2, d3}
	instructions := deconfliction.ResolveConflicts(drones)

	instMap := make(map[string]deconfliction.Instruction)
	for _, inst := range instructions {
		instMap[inst.DroneID] = inst
	}

	if instMap["D1"].Action != deconfliction.Maintain {
		t.Errorf("D1 should Maintain")
	}

	if instMap["D2"].Action != deconfliction.AdjustAltitude {
		t.Logf("D2 action: %v", instMap["D2"].Action)
	}

	if instMap["D3"].Action != deconfliction.AdjustAltitude {
		t.Logf("D3 action: %v", instMap["D3"].Action)
	}

	if len(instructions) != 3 {
		t.Errorf("Expected 3 instructions")
	}
}

func TestImmediateProximity(t *testing.T) {
	d1 := deconfliction.Drone{ID: "D1", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 50}
	d2 := deconfliction.Drone{ID: "D2", Position: deconfliction.Vector3{X: 2, Y: 0, Z: 10}, Battery: 60}

	drones := []deconfliction.Drone{d1, d2}
	instructions := deconfliction.ResolveConflicts(drones)

	instMap := make(map[string]deconfliction.Instruction)
	for _, inst := range instructions {
		instMap[inst.DroneID] = inst
	}

	if instMap["D2"].Action != deconfliction.AdjustAltitude {
		t.Errorf("Expected D2 to adjust altitude due to immediate proximity")
	}
}

func TestParallelFlight(t *testing.T) {
	d1 := deconfliction.Drone{
		ID:       "D1",
		Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10},
		Velocity: deconfliction.Vector3{X: 1, Y: 0, Z: 0},
		Battery:  50,
	}
	d2 := deconfliction.Drone{
		ID:       "D2",
		Position: deconfliction.Vector3{X: 0, Y: 2, Z: 10},
		Velocity: deconfliction.Vector3{X: 1, Y: 0, Z: 0},
		Battery:  60,
	}

	drones := []deconfliction.Drone{d1, d2}
	instructions := deconfliction.ResolveConflicts(drones)

	instMap := make(map[string]deconfliction.Instruction)
	for _, inst := range instructions {
		instMap[inst.DroneID] = inst
	}

	if instMap["D2"].Action != deconfliction.AdjustAltitude {
		t.Errorf("Expected D2 to adjust altitude in parallel flight")
	}
}

func TestZeroVelocity(t *testing.T) {
	d1 := deconfliction.Drone{ID: "D1", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 50}
	d2 := deconfliction.Drone{ID: "D2", Position: deconfliction.Vector3{X: 0, Y: 0, Z: 10}, Battery: 60}

	drones := []deconfliction.Drone{d1, d2}
	instructions := deconfliction.ResolveConflicts(drones)

	instMap := make(map[string]deconfliction.Instruction)
	for _, inst := range instructions {
		instMap[inst.DroneID] = inst
	}

	if instMap["D2"].Action != deconfliction.AdjustAltitude {
		t.Errorf("Expected D2 to adjust altitude with zero velocity overlap")
	}
}
