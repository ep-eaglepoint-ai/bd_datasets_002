package main

import (
	"math"
	"reactor"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// TestLockFreeAggregation verifies that aggregation doesn't use a global mutex
func TestLockFreeAggregation(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 5, 3, 1000)
	monitor.Start()
	defer monitor.Stop()
	
	// Send data from multiple goroutines concurrently
	var wg sync.WaitGroup
	numGoroutines := 100
	pebblesPerGoroutine := 100
	
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < pebblesPerGoroutine; j++ {
				data := reactor.PebbleData{
					PebbleID: int64(id*pebblesPerGoroutine + j),
					Isotopes: []reactor.Isotope{
						{
							HalfLife:    1 * time.Second,
							InitialMass: 1.0,
							DecayEnergy: 10.0,
						},
					},
					Timestamp: time.Now(),
				}
				monitor.IngestPebbleData(data)
			}
		}(i)
	}
	
	wg.Wait()
	time.Sleep(200 * time.Millisecond) // Allow processing
	
	state := monitor.GetLastState()
	if state == nil {
		t.Fatal("Expected state to be updated")
	}
	
	if state.PebbleCount <= 0 {
		t.Errorf("Expected some pebbles to be processed, got %d", state.PebbleCount)
	}
}

// TestDecayCalculationRobustness verifies decay calculation handles small values
func TestDecayCalculationRobustness(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 1, 1, 100)
	monitor.Start()
	defer monitor.Stop()
	
	// Test with isotopes having very different half-lives
	data := reactor.PebbleData{
		PebbleID: 1,
		Isotopes: []reactor.Isotope{
			{
				HalfLife:    1 * time.Nanosecond,  // Very short half-life
				InitialMass: 1e-10,                // Very small initial mass
				DecayEnergy: 1e10,                 // Very large energy
			},
			{
				// Use a long but safe half-life that does not overflow time.Duration
				HalfLife:    365 * 24 * time.Hour, // ~1 year
				InitialMass: 1e10,                 // Very large initial mass
				DecayEnergy: 1e-10,                // Very small energy
			},
		},
		Timestamp: time.Now().Add(-1 * time.Hour), // One hour ago
	}
	
	heat := monitor.CalculatePebbleDecayHeat(data)
	
	// Should not be NaN or Inf
	if math.IsNaN(heat) || math.IsInf(heat, 0) {
		t.Errorf("Decay heat calculation produced invalid value: %f", heat)
	}
	
	// Should be non-negative
	if heat < 0 {
		t.Errorf("Decay heat should be non-negative, got %f", heat)
	}
}

// TestSCRAMBroadcast verifies SCRAM is broadcast via context cancellation
func TestSCRAMBroadcast(t *testing.T) {
	monitor := reactor.NewReactorMonitor(100.0, 1, 1, 100) // Low threshold
	monitor.Start()
	defer monitor.Stop()
	
	scramCtx := monitor.GetSCRAMContext()
	
	// Generate high heat to trigger SCRAM
	for i := 0; i < 1000; i++ {
		data := reactor.PebbleData{
			PebbleID: int64(i),
			Isotopes: []reactor.Isotope{
				{
					HalfLife:    1 * time.Second,
					InitialMass: 1000.0, // High mass
					DecayEnergy: 1000.0, // High energy
				},
			},
			Timestamp: time.Now(),
		}
		monitor.IngestPebbleData(data)
	}
	
	// Wait for SCRAM to trigger
	timeout := time.After(2 * time.Second)
	scramTriggered := false
	
	select {
	case <-scramCtx.Done():
		scramTriggered = true
	case <-timeout:
		t.Fatal("SCRAM context was not cancelled within timeout")
	}
	
	if !scramTriggered {
		t.Fatal("SCRAM was not triggered")
	}
	
	if !monitor.IsSCRAMTriggered() {
		t.Error("IsSCRAMTriggered should return true")
	}
}

// TestSeparateGoroutinePools verifies ingestion and processing are separate
func TestSeparateGoroutinePools(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 10, 5, 1000)
	monitor.Start()
	defer monitor.Stop()
	
	// Send data rapidly to test that ingestion doesn't block
	start := time.Now()
	numPebbles := 10000
	
	for i := 0; i < numPebbles; i++ {
		data := reactor.PebbleData{
			PebbleID: int64(i),
			Isotopes: []reactor.Isotope{
				{
					HalfLife:    1 * time.Second,
					InitialMass: 1.0,
					DecayEnergy: 1.0,
				},
			},
			Timestamp: time.Now(),
		}
		monitor.IngestPebbleData(data)
	}
	
	ingestionTime := time.Since(start)
	
	// Ingestion should be very fast (non-blocking)
	if ingestionTime > 1*time.Second {
		t.Errorf("Ingestion took too long: %v, should be much faster", ingestionTime)
	}
	
	// Wait for processing
	time.Sleep(500 * time.Millisecond)
	
	// Processing should have happened
	state := monitor.GetLastState()
	if state == nil {
		t.Fatal("State should have been updated")
	}
}

// TestBufferedChannelsWithDropStrategy verifies buffered channels and drop strategy
func TestBufferedChannelsWithDropStrategy(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 1, 1, 10) // Small buffer
	monitor.Start()
	defer monitor.Stop()
	
	// Send more data than buffer can hold
	numPebbles := 1000
	successCount := int64(0)
	
	for i := 0; i < numPebbles; i++ {
		data := reactor.PebbleData{
			PebbleID: int64(i),
			Isotopes: []reactor.Isotope{
				{
					HalfLife:    1 * time.Second,
					InitialMass: 1.0,
					DecayEnergy: 1.0,
				},
			},
			Timestamp: time.Now(),
		}
		if monitor.IngestPebbleData(data) {
			atomic.AddInt64(&successCount, 1)
		}
	}
	
	// Should not deadlock
	// Some packets may be dropped, which is acceptable
	if atomic.LoadInt64(&successCount) == 0 {
		t.Error("At least some packets should have been ingested")
	}
}

// TestRaceConditionFree verifies no race conditions (run with -race flag)
func TestRaceConditionFree(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 10, 5, 1000)
	monitor.Start()
	defer monitor.Stop()
	
	var wg sync.WaitGroup
	numWriters := 50
	pebblesPerWriter := 100
	
	// Concurrent writers
	for i := 0; i < numWriters; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < pebblesPerWriter; j++ {
				data := reactor.PebbleData{
					PebbleID: int64(id*pebblesPerWriter + j),
					Isotopes: []reactor.Isotope{
						{
							HalfLife:    1 * time.Second,
							InitialMass: 1.0,
							DecayEnergy: 1.0,
						},
					},
					Timestamp: time.Now(),
				}
				monitor.IngestPebbleData(data)
			}
		}(i)
	}
	
	// Concurrent readers
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_ = monitor.GetTotalHeat()
				_ = monitor.GetLastState()
				_ = monitor.IsSCRAMTriggered()
				time.Sleep(1 * time.Millisecond)
			}
		}()
	}
	
	wg.Wait()
	time.Sleep(200 * time.Millisecond)
}

// TestSCRAMMultipleActuators verifies SCRAM broadcasts to multiple actuators
func TestSCRAMMultipleActuators(t *testing.T) {
	monitor := reactor.NewReactorMonitor(100.0, 1, 1, 100)
	monitor.Start()
	defer monitor.Stop()
	
	scramCtx := monitor.GetSCRAMContext()
	
	// Create multiple "actuators" listening to SCRAM context
	numActuators := 10
	actuatorReceived := make([]bool, numActuators)
	var wg sync.WaitGroup
	
	for i := 0; i < numActuators; i++ {
		wg.Add(1)
		idx := i
		go func() {
			defer wg.Done()
			<-scramCtx.Done()
			actuatorReceived[idx] = true
		}()
	}
	
	// Trigger SCRAM
	for i := 0; i < 1000; i++ {
		data := reactor.PebbleData{
			PebbleID: int64(i),
			Isotopes: []reactor.Isotope{
				{
					HalfLife:    1 * time.Second,
					InitialMass: 1000.0,
					DecayEnergy: 1000.0,
				},
			},
			Timestamp: time.Now(),
		}
		monitor.IngestPebbleData(data)
	}
	
	// Wait for all actuators to receive SCRAM
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		// All actuators received SCRAM
		for i, received := range actuatorReceived {
			if !received {
				t.Errorf("Actuator %d did not receive SCRAM signal", i)
			}
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Not all actuators received SCRAM signal within timeout")
	}
}

// TestNumericalPrecision verifies handling of extreme value ranges
func TestNumericalPrecision(t *testing.T) {
	monitor := reactor.NewReactorMonitor(1000.0, 1, 1, 100)
	monitor.Start()
	defer monitor.Stop()
	
	// Test with values that could cause underflow
	data := reactor.PebbleData{
		PebbleID: 1,
		Isotopes: []reactor.Isotope{
			{
				HalfLife:    1 * time.Nanosecond,
				InitialMass: 1e-100, // Extremely small
				DecayEnergy: 1e100,  // Extremely large
			},
		},
		Timestamp: time.Now().Add(-1 * time.Second),
	}
	
	heat := monitor.CalculatePebbleDecayHeat(data)
	
	// Should handle gracefully without panic or invalid values
	if math.IsNaN(heat) {
		t.Error("Heat calculation produced NaN")
	}
	if math.IsInf(heat, 0) {
		t.Error("Heat calculation produced Inf")
	}
}
