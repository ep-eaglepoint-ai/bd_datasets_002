// This is an example of broken code that would fail tests
// It doesn't handle out-of-order readings and has incorrect cumulative calculation

package main

import "time"

type BreachDetector struct {
	readings []TemperatureReading
}

func (bd *BreachDetector) ProcessReading(reading TemperatureReading) Status {
	// Broken: Just appends without sorting - doesn't handle out-of-order
	bd.readings = append(bd.readings, reading)
	
	// Broken: Simple count, doesn't calculate cumulative duration correctly
	count := 0
	for _, r := range bd.readings {
		if r.Value > 8.0 {
			count++
		}
	}
	
	if count > 100 {
		return StatusCompromised
	}
	return StatusSafe
}
