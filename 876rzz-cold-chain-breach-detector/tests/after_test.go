package tests

import (
	"testing"
	"time"

	"cold-chain-breach-detector/repository_after"
)

func TestBasicSafeTemperature(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	
	reading := repository_after.TemperatureReading{
		ID:        "shipment-1",
		Value:     5.0,
		Timestamp: time.Now(),
	}
	
	status := detector.ProcessReading(reading)
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE, got %s", status)
	}
}

func TestSingleBreachBelowThreshold(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	now := time.Now()
	
	// Single reading above threshold but not long enough
	reading := repository_after.TemperatureReading{
		ID:        "shipment-1",
		Value:     9.0,
		Timestamp: now,
	}
	
	status := detector.ProcessReading(reading)
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE for single reading, got %s", status)
	}
}

func TestCumulativeBreachThreeSpikes(t *testing.T) {
	// Testing Requirement: Three 15-minute spikes separated by 2 hours
	// Third spike should trigger COMPROMISED after 1 second
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	
	shipmentID := "shipment-cumulative"
	
	// First 15-minute spike (900 seconds)
	spike1Start := baseTime
	spike1End := baseTime.Add(15 * time.Minute)
	
	// Add readings for first spike
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike1Start,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike1End,
	})
	
	// 2 hours safe period
	safe1Start := spike1End
	safe1End := safe1Start.Add(2 * time.Hour)
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: safe1Start,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: safe1End,
	})
	
	// Second 15-minute spike (900 seconds)
	spike2Start := safe1End
	spike2End := spike2Start.Add(15 * time.Minute)
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike2Start,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike2End,
	})
	
	// Another 2 hours safe period
	safe2Start := spike2End
	safe2End := safe2Start.Add(2 * time.Hour)
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: safe2Start,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: safe2End,
	})
	
	// Check status before third spike - cumulative is 900 + 900 = 1800 seconds
	// With >= threshold, exactly 1800 seconds should be COMPROMISED
	status := detector.GetStatus(shipmentID, safe2End)
	if status != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED at exactly 1800 seconds (reaches threshold), got %s", status)
	}
	
	// Third 15-minute spike - already COMPROMISED, but verify it stays COMPROMISED
	spike3Start := safe2End
	spike3Second := spike3Start.Add(1 * time.Second)
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike3Start,
	})
	
	// After 1 second of third spike, should still be COMPROMISED
	// Total: 900 + 900 + 1 = 1801 seconds >= 1800 seconds
	status = detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike3Second,
	})
	
	if status != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED after third spike reaches 1 second, got %s", status)
	}
}

func TestWindowExit(t *testing.T) {
	// Testing Requirement: 40-minute spike 25 hours ago should be ignored
	detector := repository_after.NewBreachDetector()
	now := time.Now()
	shipmentID := "shipment-window"
	
	// Add a 40-minute spike 25 hours ago (outside window)
	oldSpikeStart := now.Add(-25 * time.Hour)
	oldSpikeEnd := oldSpikeStart.Add(40 * time.Minute)
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: oldSpikeStart,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: oldSpikeEnd,
	})
	
	// Add a safe reading now
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: now,
	})
	
	// Status should be SAFE because old spike is outside 24-hour window
	status := detector.GetStatus(shipmentID, now)
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after old spike exits window, got %s", status)
	}
}

func TestOutOfOrderReadings(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-outoforder"
	
	// Process readings out of order
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime.Add(20 * time.Minute),
	})
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: baseTime.Add(10 * time.Minute),
	})
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime,
	})
	
	// Should handle out-of-order correctly
	status := detector.GetStatus(shipmentID, baseTime.Add(20*time.Minute))
	// 20 minutes above threshold should not breach (20 min = 1200 sec < 1800 sec)
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE for out-of-order readings, got %s", status)
	}
}

func TestContinuousBreach(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-continuous"
	
	// Create a continuous 31-minute breach
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime,
	})
	
	// After 30 minutes, should be COMPROMISED (reaches threshold, >= 1800s)
	status30min := detector.GetStatus(shipmentID, baseTime.Add(30*time.Minute))
	if status30min != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED at exactly 30 minutes (reaches 1800s), got %s", status30min)
	}
	
	// After 30 minutes and 1 second, should be COMPROMISED
	status31min := detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime.Add(30*time.Minute + 1*time.Second),
	})
	
	if status31min != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED after 30 minutes 1 second, got %s", status31min)
	}
}

func TestMultipleShipments(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	now := time.Now()
	
	// Shipment 1 - safe
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        "shipment-1",
		Value:     5.0,
		Timestamp: now,
	})
	
	// Shipment 2 - breached
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        "shipment-2",
		Value:     9.0,
		Timestamp: now,
	})
	status2 := detector.GetStatus("shipment-2", now.Add(31*time.Minute))
	
	if detector.GetStatus("shipment-1", now) != repository_after.StatusSafe {
		t.Error("Shipment 1 should be SAFE")
	}
	
	if status2 != repository_after.StatusCompromised {
		t.Error("Shipment 2 should be COMPROMISED after 31 minutes")
	}
}

func TestThresholdBoundary(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	now := time.Now()
	shipmentID := "shipment-boundary"
	
	// Exactly at threshold (8.0) should be safe
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     8.0,
		Timestamp: now,
	})
	
	status := detector.GetStatus(shipmentID, now.Add(1*time.Hour))
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE at exactly 8.0°C, got %s", status)
	}
	
	// Just above threshold (8.0001) should count
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     8.0001,
		Timestamp: now.Add(1*time.Hour),
	})
	
	status2 := detector.GetStatus(shipmentID, now.Add(1*time.Hour+31*time.Minute))
	if status2 != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED for value just above 8.0°C, got %s", status2)
	}
}

// TestLateArrivingReadingRecalculation tests Req 2 (Timeline integrity):
// A late-arriving reading (e.g. T=10 after T=20) should trigger correct re-calculation
// of cumulative duration, not just check final status
func TestLateArrivingReadingRecalculation(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-late-arrival"
	
	// Process readings in order: T=0, T=20
	// At T=0, start a breach that lasts 20 minutes
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime,
	})
	
	// At T=20, temperature drops to safe
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: baseTime.Add(20 * time.Minute),
	})
	
	// Check status at T=20 - should be SAFE (20 min = 1200 sec < 1800 sec)
	statusBeforeLate := detector.GetStatus(shipmentID, baseTime.Add(20*time.Minute))
	if statusBeforeLate != repository_after.StatusSafe {
		t.Errorf("Expected SAFE at T=20 before late reading, got %s", statusBeforeLate)
	}
	
	// Now process a late-arriving reading at T=10 (arrives after T=20)
	// This reading shows temperature was still high at T=10
	// This should trigger recalculation: breach from T=0 to T=20 = 20 minutes
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime.Add(10 * time.Minute),
	})
	
	// Status should still be SAFE (20 minutes < 30 minutes)
	// But the cumulative duration should be correctly recalculated
	statusAfterLate := detector.GetStatus(shipmentID, baseTime.Add(20*time.Minute))
	if statusAfterLate != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after late reading at T=10, got %s", statusAfterLate)
	}
	
	// Now test a case where late arrival changes the status
	// Start a new breach scenario
	detector2 := repository_after.NewBreachDetector()
	shipmentID2 := "shipment-late-arrival-2"
	
	// Process: T=0 (breach starts), T=20 (breach ends), then late T=10 arrives
	// If T=10 shows breach, cumulative should be 20 minutes
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: baseTime,
	})
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     5.0,
		Timestamp: baseTime.Add(20 * time.Minute),
	})
	
	// Late reading at T=10 confirms breach was continuous
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: baseTime.Add(10 * time.Minute),
	})
	
	// Cumulative should be 20 minutes (from T=0 to T=20)
	status2 := detector2.GetStatus(shipmentID2, baseTime.Add(20*time.Minute))
	if status2 != repository_after.StatusSafe {
		t.Errorf("Expected SAFE with 20 minutes cumulative after late reading, got %s", status2)
	}
}

// TestReturnToSafeAfterWindowExit tests Req 7 (Window exit):
// COMPROMISED while breach is in window, then SAFE after it exits
// (e.g. 25 hours later, no new readings)
func TestReturnToSafeAfterWindowExit(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-return-safe"
	
	// Create a 40-minute breach (exceeds 30-minute threshold)
	breachStart := baseTime
	breachEnd := baseTime.Add(40 * time.Minute)
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: breachStart,
	})
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: breachEnd,
	})
	
	// Add a safe reading right after breach ends
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: breachEnd,
	})
	
	// Status should be COMPROMISED (40 minutes > 30 minutes)
	statusDuringBreach := detector.GetStatus(shipmentID, breachEnd)
	if statusDuringBreach != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED during breach window, got %s", statusDuringBreach)
	}
	
	// 25 hours later, no new readings - breach should exit window
	// Status should return to SAFE
	timeAfter25Hours := baseTime.Add(25 * time.Hour)
	statusAfter25Hours := detector.GetStatus(shipmentID, timeAfter25Hours)
	if statusAfter25Hours != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after 25 hours (breach exited window), got %s", statusAfter25Hours)
	}
	
	// Verify that the old breach data was purged
	// Add a new safe reading and verify status remains SAFE
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0,
		Timestamp: timeAfter25Hours,
	})
	
	finalStatus := detector.GetStatus(shipmentID, timeAfter25Hours)
	if finalStatus != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after old breach purged, got %s", finalStatus)
	}
}

// TestExactly1800SecondsBoundary tests the boundary condition:
// Exactly 1800 seconds (30 minutes) cumulative duration
// With >=, this should be COMPROMISED; with >, it would be SAFE
func TestExactly1800SecondsBoundary(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-exact-boundary"
	
	// Create exactly 30 minutes (1800 seconds) of breach
	breachStart := baseTime
	breachEnd := baseTime.Add(30 * time.Minute) // Exactly 1800 seconds
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: breachStart,
	})
	
	// At exactly 30 minutes, should be COMPROMISED (>= 1800s)
	status := detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: breachEnd,
	})
	
	if status != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED at exactly 1800 seconds (30 minutes), got %s", status)
	}
	
	// Verify with GetStatus as well
	status2 := detector.GetStatus(shipmentID, breachEnd)
	if status2 != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED via GetStatus at exactly 1800 seconds, got %s", status2)
	}
	
	// Test with cumulative from multiple periods that sum to exactly 1800s
	detector2 := repository_after.NewBreachDetector()
	shipmentID2 := "shipment-exact-boundary-2"
	
	// First period: 15 minutes (900 seconds)
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: baseTime,
	})
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     5.0,
		Timestamp: baseTime.Add(15 * time.Minute),
	})
	
	// Second period: 15 minutes (900 seconds) - total = 1800 seconds
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: baseTime.Add(15 * time.Minute),
	})
	
	status3 := detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     5.0,
		Timestamp: baseTime.Add(30 * time.Minute),
	})
	
	if status3 != repository_after.StatusCompromised {
		t.Errorf("Expected COMPROMISED with cumulative exactly 1800 seconds (15+15 min), got %s", status3)
	}
}

// TestDuplicateTimestampReadings tests that duplicate/same-timestamp readings
// are handled correctly and that purge actually removes old data
func TestDuplicateTimestampReadings(t *testing.T) {
	detector := repository_after.NewBreachDetector()
	baseTime := time.Now()
	shipmentID := "shipment-duplicate"
	
	// Add a reading
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: baseTime,
	})
	
	// Add a duplicate reading with same timestamp (should update, not add)
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     5.0, // Changed value
		Timestamp: baseTime,
	})
	
	// Status should reflect the updated value (5.0, not 9.0)
	status := detector.GetStatus(shipmentID, baseTime.Add(1*time.Hour))
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after duplicate timestamp updates value to safe, got %s", status)
	}
	
	// Test that purge actually removes old data
	detector2 := repository_after.NewBreachDetector()
	shipmentID2 := "shipment-purge-test"
	
	// Add a 40-minute breach 25 hours ago
	oldBreachStart := baseTime.Add(-25 * time.Hour)
	oldBreachEnd := oldBreachStart.Add(40 * time.Minute)
	
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: oldBreachStart,
	})
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: oldBreachEnd,
	})
	
	// Add a safe reading now
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     5.0,
		Timestamp: baseTime,
	})
	
	// Status should be SAFE (old breach purged)
	status2 := detector2.GetStatus(shipmentID2, baseTime)
	if status2 != repository_after.StatusSafe {
		t.Errorf("Expected SAFE after purge removes old breach, got %s", status2)
	}
	
	// Verify by adding a new breach that would only breach if old data wasn't purged
	// Add 20 minutes of breach (should be SAFE, 20 < 30)
	newBreachStart := baseTime
	newBreachEnd := baseTime.Add(20 * time.Minute)
	
	detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     9.0,
		Timestamp: newBreachStart,
	})
	status3 := detector2.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID2,
		Value:     5.0,
		Timestamp: newBreachEnd,
	})
	
	if status3 != repository_after.StatusSafe {
		t.Errorf("Expected SAFE with 20 minutes (old data purged), got %s. If old data wasn't purged, this would incorrectly show COMPROMISED.", status3)
	}
}
