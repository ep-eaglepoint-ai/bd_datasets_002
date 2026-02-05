package main

import (
	"fmt"
	"time"
)

// A custom error type used by plugins
type PluginError struct {
	Code    int
	Message string
}

func (e *PluginError) Error() string {
	return fmt.Sprintf("Error %d: %s", e.Code, e.Message)
}

type Plugin interface {
	Execute(data string) *PluginError
}

type AnalyticsPlugin struct{}

func (a *AnalyticsPlugin) Execute(data string) *PluginError {
	// Logic to process data...
	if data == "bad_input" {
		return &PluginError{Code: 500, Message: "Processing failed"}
	}
	// TRAP 1: Returning explicit nil pointer of type *PluginError
	var err *PluginError = nil
	return err
}

type PluginManager struct {
	plugins []Plugin
	stats   map[string]int // TRAP 2: Unsafe Map
}

func NewPluginManager() *PluginManager {
	return &PluginManager{
		plugins: []Plugin{&AnalyticsPlugin{}},
		stats:   make(map[string]int),
	}
}

func (pm *PluginManager) ProcessTransaction(txnID string, data string) error {
	// TRAP 3: Goroutine Leak (Context is ignored, no WaitGroup)
	resultChan := make(chan error)

	go func() {
		// Run plugins
		for _, p := range pm.plugins {
			// TRAP 4: The Nil Interface Bug
			// p.Execute returns *PluginError (nil).
			// Assigned to 'err' (type error interface).
			// An interface holding (type=*PluginError, value=nil) is NOT nil.
			err := p.Execute(data)
			
			if err != nil {
				resultChan <- err
				return
			}
		}
		
		// Update stats asynchronously
		// TRAP 2: Data Race on pm.stats
		pm.stats["processed_count"]++
		resultChan <- nil
	}()

	// Wait for result
	select {
	case err := <-resultChan:
		return err
	case <-time.After(2 * time.Second):
		return fmt.Errorf("timeout")
	}
}

func main() {
	pm := NewPluginManager()
	// This should succeed, but returns an error due to Trap 4
	err := pm.ProcessTransaction("tx1", "good_input")
	if err != nil {
		fmt.Printf("Transaction FAILED: %v\n", err)
	} else {
		fmt.Println("Transaction SUCCESS")
	}
}
