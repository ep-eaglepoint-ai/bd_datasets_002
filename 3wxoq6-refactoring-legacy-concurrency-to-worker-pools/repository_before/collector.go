package main

import (
"fmt"
"time"
)

// Global state - BAD
var metricsCache = make(map[string]int)

func ProcessIncomingLogs(logs []string) {
for _, log := range logs {
// Launching goroutine per log entry
go func() {
// Simulating processing logic
region := parseRegion(log)
// RACE CONDITION HERE
metricsCache[region]++
}()
}
}

func parseRegion(log string) string {
// ... dummy implementation
return "us-east-1"
}

func PrintStats() {
for k, v := range metricsCache {
fmt.Printf("%s: %d\n", k, v)
}
}