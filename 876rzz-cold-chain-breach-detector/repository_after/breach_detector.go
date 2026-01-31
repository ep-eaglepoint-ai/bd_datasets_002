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
	
	// Check if breached (reaches or exceeds 30 minutes)
	if tracker.cumulativeDuration >= MaxCumulativeDuration {
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
	
	if tracker.cumulativeDuration >= MaxCumulativeDuration {
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
// Optimized to iterate in place instead of allocating a new slice
func (bd *BreachDetector) recalculateCumulativeDuration(tracker *ShipmentTracker, currentTime time.Time) {
	tracker.cumulativeDuration = 0
	
	if len(tracker.readings) == 0 {
		return
	}
	
	windowStart := currentTime.Add(-WindowDuration)
	
	// Find the first reading within the window using binary search
	firstIndex := sort.Search(len(tracker.readings), func(i int) bool {
		return !tracker.readings[i].Timestamp.Before(windowStart)
	})
	
	// Track periods where temperature is continuously above threshold
	// We count time from a reading above threshold until the next reading (which may show it dropped)
	// or until current time if it's the last reading
	for i := firstIndex; i < len(tracker.readings); i++ {
		reading := tracker.readings[i]
		
		// Stop if reading is after current time
		if reading.Timestamp.After(currentTime) {
			break
		}
		
		// If current reading is above threshold, calculate duration to next reading or current time
		if reading.Value > ThresholdTemperature {
			if i < len(tracker.readings)-1 {
				// There's a next reading - check if it's within the window
				nextReading := tracker.readings[i+1]
				if !nextReading.Timestamp.Before(windowStart) && !nextReading.Timestamp.After(currentTime) {
					// Next reading is within window - count time to next reading
					duration := nextReading.Timestamp.Sub(reading.Timestamp)
					tracker.cumulativeDuration += duration
				} else {
					// Next reading is outside window or after current time - count to current time
					duration := currentTime.Sub(reading.Timestamp)
					if duration > 0 {
						tracker.cumulativeDuration += duration
					}
				}
			} else {
				// This is the last reading - count time to current time
				duration := currentTime.Sub(reading.Timestamp)
				if duration > 0 {
					tracker.cumulativeDuration += duration
				}
			}
		}
	}
}
