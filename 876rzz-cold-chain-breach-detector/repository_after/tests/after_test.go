package tests

import (
	"testing"
	"time"

	repository_after "cold-chain-breach-detector"
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
	
	// Check status before third spike - should be SAFE
	status := detector.GetStatus(shipmentID, safe2End)
	if status != repository_after.StatusSafe {
		t.Errorf("Expected SAFE before third spike, got %s", status)
	}
	
	// Third 15-minute spike - should trigger COMPROMISED after 1 second
	spike3Start := safe2End
	spike3Second := spike3Start.Add(1 * time.Second)
	
	detector.ProcessReading(repository_after.TemperatureReading{
		ID:        shipmentID,
		Value:     9.0,
		Timestamp: spike3Start,
	})
	
	// After 1 second of third spike, should be COMPROMISED
	// Total: 900 + 900 + 1 = 1801 seconds > 1800 seconds
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
	
	// After 30 minutes, should still be SAFE (exactly at threshold)
	status30min := detector.GetStatus(shipmentID, baseTime.Add(30*time.Minute))
	if status30min != repository_after.StatusSafe {
		t.Errorf("Expected SAFE at exactly 30 minutes, got %s", status30min)
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
