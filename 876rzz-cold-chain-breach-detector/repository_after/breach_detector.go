package repository_after

import (
	"sort"
	"time"
)

const (
	// ThresholdTemperature is the maximum safe temperature in Celsius
	ThresholdTemperature = 8.0
	// MaxCumulativeDuration is the maximum cumulative time above threshold (30 minutes)
	MaxCumulativeDuration = 30 * time.Minute
	// WindowDuration is the 24-hour sliding window
	WindowDuration = 24 * time.Hour
)

// Status represents the shipment status
type Status string

const (
	StatusSafe       Status = "SAFE"
	StatusCompromised Status = "COMPROMISED"
)

// TemperatureReading represents a single temperature reading
type TemperatureReading struct {
	ID        string
	Value     float64
	Timestamp time.Time
}

// BreachDetector tracks temperature readings and detects breaches
type BreachDetector struct {
	shipments map[string]*ShipmentTracker
}

// ShipmentTracker tracks readings for a single shipment
type ShipmentTracker struct {
	readings           []TemperatureReading
	cumulativeDuration time.Duration
}

// NewBreachDetector creates a new BreachDetector instance
func NewBreachDetector() *BreachDetector {
	return &BreachDetector{
		shipments: make(map[string]*ShipmentTracker),
	}
}

// ProcessReading processes a temperature reading and returns the current status
func (bd *BreachDetector) ProcessReading(reading TemperatureReading) Status {
	tracker := bd.getOrCreateTracker(reading.ID)
	
	// Insert reading in chronological order (handle out-of-order data)
	bd.insertReading(tracker, reading)
	
	// Purge old readings and update cumulative duration
	bd.purgeOldReadings(tracker, reading.Timestamp)
	
	// Recalculate cumulative duration for the 24-hour window
	bd.recalculateCumulativeDuration(tracker, reading.Timestamp)
	
	// Check if breached (must exceed 30 minutes, not equal)
	if tracker.cumulativeDuration > MaxCumulativeDuration {
		return StatusCompromised
	}
	
	return StatusSafe
}

// GetStatus returns the current status without processing a new reading
func (bd *BreachDetector) GetStatus(shipmentID string, currentTime time.Time) Status {
	tracker, exists := bd.shipments[shipmentID]
	if !exists {
		return StatusSafe
	}
	
	// Purge old readings
	bd.purgeOldReadings(tracker, currentTime)
	
	// Recalculate cumulative duration
	bd.recalculateCumulativeDuration(tracker, currentTime)
	
	if tracker.cumulativeDuration > MaxCumulativeDuration {
		return StatusCompromised
	}
	
	return StatusSafe
}

// getOrCreateTracker gets or creates a tracker for a shipment
func (bd *BreachDetector) getOrCreateTracker(shipmentID string) *ShipmentTracker {
	tracker, exists := bd.shipments[shipmentID]
	if !exists {
		tracker = &ShipmentTracker{
			readings:           make([]TemperatureReading, 0),
			cumulativeDuration: 0,
		}
		bd.shipments[shipmentID] = tracker
	}
	return tracker
}

// insertReading inserts a reading in chronological order
func (bd *BreachDetector) insertReading(tracker *ShipmentTracker, reading TemperatureReading) {
	// Find insertion point
	insertIndex := sort.Search(len(tracker.readings), func(i int) bool {
		return tracker.readings[i].Timestamp.After(reading.Timestamp) || 
			   tracker.readings[i].Timestamp.Equal(reading.Timestamp)
	})
	
	// Check if reading already exists (same timestamp and ID)
	if insertIndex < len(tracker.readings) && 
	   tracker.readings[insertIndex].Timestamp.Equal(reading.Timestamp) &&
	   tracker.readings[insertIndex].ID == reading.ID {
		// Update existing reading
		tracker.readings[insertIndex] = reading
		return
	}
	
	// Insert at the correct position
	tracker.readings = append(tracker.readings, TemperatureReading{})
	copy(tracker.readings[insertIndex+1:], tracker.readings[insertIndex:])
	tracker.readings[insertIndex] = reading
}

// purgeOldReadings removes readings older than 24 hours from the window
func (bd *BreachDetector) purgeOldReadings(tracker *ShipmentTracker, currentTime time.Time) {
	windowStart := currentTime.Add(-WindowDuration)
	
	// Find the first reading within the window
	firstValidIndex := sort.Search(len(tracker.readings), func(i int) bool {
		return !tracker.readings[i].Timestamp.Before(windowStart)
	})
	
	// Remove readings before the window
	if firstValidIndex > 0 {
		tracker.readings = tracker.readings[firstValidIndex:]
	}
}

// recalculateCumulativeDuration recalculates the cumulative duration above threshold
func (bd *BreachDetector) recalculateCumulativeDuration(tracker *ShipmentTracker, currentTime time.Time) {
	tracker.cumulativeDuration = 0
	
	if len(tracker.readings) == 0 {
		return
	}
	
	windowStart := currentTime.Add(-WindowDuration)
	
	// Find readings within the window
	readingsInWindow := make([]TemperatureReading, 0)
	for _, reading := range tracker.readings {
		if !reading.Timestamp.Before(windowStart) && !reading.Timestamp.After(currentTime) {
			readingsInWindow = append(readingsInWindow, reading)
		}
	}
	
	if len(readingsInWindow) == 0 {
		return
	}
	
	// Track periods where temperature is continuously above threshold
	// We count time from a reading above threshold until the next reading (which may show it dropped)
	// or until current time if it's the last reading
	for i := 0; i < len(readingsInWindow)-1; i++ {
		currentReading := readingsInWindow[i]
		nextReading := readingsInWindow[i+1]
		
		// If current reading is above threshold, count time to next reading
		// The next reading will show if temperature dropped or continued above
		if currentReading.Value > ThresholdTemperature {
			duration := nextReading.Timestamp.Sub(currentReading.Timestamp)
			tracker.cumulativeDuration += duration
		}
	}
	
	// Handle the last reading - if it's above threshold, calculate duration to current time
	lastReading := readingsInWindow[len(readingsInWindow)-1]
	if lastReading.Value > ThresholdTemperature {
		// The period from last reading continues until current time
		// (readingsInWindow already filters to only include readings within the window)
		duration := currentTime.Sub(lastReading.Timestamp)
		if duration > 0 {
			tracker.cumulativeDuration += duration
		}
	}
}
