package main

import (
	"fmt"
	"reactor"
	"time"
)

func main() {
	// Example usage of the reactor monitoring system
	monitor := reactor.NewReactorMonitor(
		1000.0,  // maxCoolantTemp: 1000°C
		10,      // ingestionWorkers: 10 goroutines
		5,       // processingWorkers: 5 goroutines
		10000,   // channelBufferSize: 10000 buffered
	)
	
	monitor.Start()
	defer monitor.Stop()
	
	// Simulate some pebble data
	for i := int64(0); i < 100; i++ {
		data := reactor.PebbleData{
			PebbleID: i,
			Isotopes: []reactor.Isotope{
				{
					HalfLife:    10 * time.Second,
					InitialMass: 1.0,
					DecayEnergy: 100.0,
				},
				{
					HalfLife:    100 * time.Millisecond,
					InitialMass: 0.5,
					DecayEnergy: 50.0,
				},
			},
			Timestamp: time.Now(),
		}
		
		monitor.IngestPebbleData(data)
	}
	
	// Wait a bit for processing
	time.Sleep(100 * time.Millisecond)
	
	// Check state
	state := monitor.GetLastState()
	if state != nil {
		fmt.Printf("Total Decay Heat: %.2f W\n", state.TotalDecayHeat)
		fmt.Printf("Coolant Temperature: %.2f °C\n", state.CoolantTemp)
		fmt.Printf("Pebble Count: %d\n", state.PebbleCount)
	}
	
	fmt.Println("Reactor monitoring system running...")
}
