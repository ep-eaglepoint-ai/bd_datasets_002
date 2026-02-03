// This is an example of working code that passes tests
// It properly handles all requirements

package main

import (
	"sort"
	"time"
)

const (
	ThresholdTemperature = 8.0
	MaxCumulativeDuration = 30 * time.Minute
	WindowDuration = 24 * time.Hour
)

type BreachDetector struct {
	shipments map[string]*ShipmentTracker
}

type ShipmentTracker struct {
	readings           []TemperatureReading
	cumulativeDuration time.Duration
}

func NewBreachDetector() *BreachDetector {
	return &BreachDetector{
		shipments: make(map[string]*ShipmentTracker),
	}
}

func (bd *BreachDetector) ProcessReading(reading TemperatureReading) Status {
	tracker := bd.getOrCreateTracker(reading.ID)
	bd.insertReading(tracker, reading)
	bd.purgeOldReadings(tracker, reading.Timestamp)
	bd.recalculateCumulativeDuration(tracker, reading.Timestamp)
	
	if tracker.cumulativeDuration >= MaxCumulativeDuration {
		return StatusCompromised
	}
	return StatusSafe
}

func (bd *BreachDetector) getOrCreateTracker(shipmentID string) *ShipmentTracker {
	tracker, exists := bd.shipments[shipmentID]
	if !exists {
		tracker = &ShipmentTracker{
			readings: make([]TemperatureReading, 0),
		}
		bd.shipments[shipmentID] = tracker
	}
	return tracker
}

func (bd *BreachDetector) insertReading(tracker *ShipmentTracker, reading TemperatureReading) {
	insertIndex := sort.Search(len(tracker.readings), func(i int) bool {
		return tracker.readings[i].Timestamp.After(reading.Timestamp) || 
			   tracker.readings[i].Timestamp.Equal(reading.Timestamp)
	})
	
	if insertIndex < len(tracker.readings) && 
	   tracker.readings[insertIndex].Timestamp.Equal(reading.Timestamp) &&
	   tracker.readings[insertIndex].ID == reading.ID {
		tracker.readings[insertIndex] = reading
		return
	}
	
	tracker.readings = append(tracker.readings, TemperatureReading{})
	copy(tracker.readings[insertIndex+1:], tracker.readings[insertIndex:])
	tracker.readings[insertIndex] = reading
}

func (bd *BreachDetector) purgeOldReadings(tracker *ShipmentTracker, currentTime time.Time) {
	windowStart := currentTime.Add(-WindowDuration)
	firstValidIndex := sort.Search(len(tracker.readings), func(i int) bool {
		return !tracker.readings[i].Timestamp.Before(windowStart)
	})
	
	if firstValidIndex > 0 {
		tracker.readings = tracker.readings[firstValidIndex:]
	}
}

func (bd *BreachDetector) recalculateCumulativeDuration(tracker *ShipmentTracker, currentTime time.Time) {
	tracker.cumulativeDuration = 0
	
	if len(tracker.readings) == 0 {
		return
	}
	
	windowStart := currentTime.Add(-WindowDuration)
	readingsInWindow := make([]TemperatureReading, 0)
	
	for _, reading := range tracker.readings {
		if !reading.Timestamp.Before(windowStart) && !reading.Timestamp.After(currentTime) {
			readingsInWindow = append(readingsInWindow, reading)
		}
	}
	
	if len(readingsInWindow) == 0 {
		return
	}
	
	for i := 0; i < len(readingsInWindow)-1; i++ {
		currentReading := readingsInWindow[i]
		if currentReading.Value > ThresholdTemperature {
			duration := readingsInWindow[i+1].Timestamp.Sub(currentReading.Timestamp)
			tracker.cumulativeDuration += duration
		}
	}
	
	lastReading := readingsInWindow[len(readingsInWindow)-1]
	if lastReading.Value > ThresholdTemperature {
		windowEnd := lastReading.Timestamp.Add(WindowDuration)
		endTime := currentTime
		if windowEnd.Before(currentTime) {
			endTime = windowEnd
		}
		duration := endTime.Sub(lastReading.Timestamp)
		if duration > 0 {
			tracker.cumulativeDuration += duration
		}
	}
}
