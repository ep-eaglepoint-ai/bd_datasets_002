package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// TestEvent represents a Go test JSON output event
type TestEvent struct {
	Time    string  `json:"Time"`
	Action  string  `json:"Action"`
	Package string  `json:"Package"`
	Test    string  `json:"Test"`
	Output  string  `json:"Output"`
	Elapsed float64 `json:"Elapsed"`
}

// Report represents the evaluation report
type Report struct {
	Timestamp       string            `json:"timestamp"`
	RepositoryAfter RepositoryResults `json:"repository_after"`
	Success         bool              `json:"success"`
}

// RepositoryResults contains test results
type RepositoryResults struct {
	Tests   map[string]string `json:"tests"`
	Metrics Metrics           `json:"metrics"`
}

// Metrics contains test metrics
type Metrics struct {
	Total  int `json:"total"`
	Passed int `json:"passed"`
	Failed int `json:"failed"`
}

func main() {
	fmt.Println(string(repeat('=', 60)))
	fmt.Println("Discount Resolution Engine - Evaluation")
	fmt.Println(string(repeat('=', 60)))

	results := make(map[string]string)
	passed := 0
	failed := 0

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Text()
		
		var event TestEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if event.Test != "" && (event.Action == "pass" || event.Action == "fail") {
			if event.Action == "pass" {
				results[event.Test] = "PASSED"
				passed++
			} else {
				results[event.Test] = "FAILED"
				failed++
			}
		}
	}

	total := passed + failed

	fmt.Printf("\n📂 Evaluating repository_after...\n")
	fmt.Printf("   ✓ Passed: %d\n", passed)
	fmt.Printf("   ✗ Failed: %d\n", failed)

	// Generate report
	report := Report{
		Timestamp: time.Now().Format(time.RFC3339),
		RepositoryAfter: RepositoryResults{
			Tests: results,
			Metrics: Metrics{
				Total:  total,
				Passed: passed,
				Failed: failed,
			},
		},
		Success: failed == 0 && total > 0,
	}

	// Save report
	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15-04-05")
	outputDir := filepath.Join("evaluation", dateStr, timeStr)
	
	os.MkdirAll(outputDir, 0755)
	outputFile := filepath.Join(outputDir, "report.json")
	
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(outputFile, reportJSON, 0644)

	fmt.Printf("\n%s\n", string(repeat('=', 60)))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Println(string(repeat('=', 60)))
	fmt.Printf("Total Tests: %d\n", total)
	fmt.Printf("Passed: %d\n", passed)
	fmt.Printf("Failed: %d\n", failed)
	
	if total > 0 {
		fmt.Printf("Success Rate: %.1f%%\n", float64(passed)/float64(total)*100)
	}
	
	if report.Success {
		fmt.Println("Overall: ✓ PASS")
	} else {
		fmt.Println("Overall: ✗ FAIL")
	}
	fmt.Println(string(repeat('=', 60)))

	if !report.Success {
		os.Exit(1)
	}
}

func repeat(char rune, count int) []rune {
	result := make([]rune, count)
	for i := range result {
		result[i] = char
	}
	return result
}