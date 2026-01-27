package repository_after

import (
	"context"
	"fmt"
	"sync"
)

// AsyncCollector manages log processing using worker pool pattern
type AsyncCollector struct {
	store      MetricStore
	jobQueue   chan string
	workers    int
	wg         sync.WaitGroup
}

// NewAsyncCollector creates a new AsyncCollector with dependency injection
func NewAsyncCollector(store MetricStore, bufferSize, workers int) *AsyncCollector {
	return &AsyncCollector{
		store:    store,
		jobQueue: make(chan string, bufferSize),
		workers:  workers,
	}
}

// Start initializes the worker pool
func (ac *AsyncCollector) Start(ctx context.Context) {
	for i := 0; i < ac.workers; i++ {
		ac.wg.Add(1)
		go ac.worker(ctx)
	}
}

// worker processes jobs from the job queue
func (ac *AsyncCollector) worker(ctx context.Context) {
	defer ac.wg.Done()
	
	for {
		select {
		case log, ok := <-ac.jobQueue:
			if !ok {
				// Channel closed, exit worker
				return
			}
			// Process the log entry
			region := parseRegion(log)
			ac.store.Inc(region)
			
		case <-ctx.Done():
			// Context cancelled, finish remaining jobs then exit
			// Drain remaining jobs from queue
			for {
				select {
				case log, ok := <-ac.jobQueue:
					if !ok {
						return
					}
					region := parseRegion(log)
					ac.store.Inc(region)
				default:
					return
				}
			}
		}
	}
}

// ProcessIncomingLogs sends logs to the job queue for processing
func (ac *AsyncCollector) ProcessIncomingLogs(ctx context.Context, logs []string) {
	for _, log := range logs {
		select {
		case ac.jobQueue <- log:
			// Job successfully queued
		case <-ctx.Done():
			// Context cancelled, stop processing
			return
		}
	}
}

// Shutdown gracefully shuts down the collector
func (ac *AsyncCollector) Shutdown() {
	close(ac.jobQueue)
	ac.wg.Wait()
}

// GetStats returns current statistics from the store
func (ac *AsyncCollector) GetStats() map[string]int {
	stats := make(map[string]int)
	// Since we don't have a way to iterate over all keys in the interface,
	// we'll return known regions for this implementation
	regions := []string{"us-east-1", "us-west-1", "eu-west-1", "ap-southeast-1"}
	for _, region := range regions {
		if count := ac.store.Get(region); count > 0 {
			stats[region] = count
		}
	}
	return stats
}

// PrintStats displays current statistics
func (ac *AsyncCollector) PrintStats() {
	stats := ac.GetStats()
	for k, v := range stats {
		fmt.Printf("%s: %d\n", k, v)
	}
}

// parseRegion extracts region from log (dummy implementation)
func parseRegion(log string) string {
	// ... dummy implementation - in real scenario, parse from log
	return "us-east-1"
}
