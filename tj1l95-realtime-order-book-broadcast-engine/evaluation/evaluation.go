package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TestEvent struct { Time, Action, Package, Test, Output string; Elapsed float64 }

type Report struct {
	Timestamp string `json:"timestamp"`
	RepositoryAfter struct {
		Tests   map[string]string `json:"tests"`
		Metrics struct { Total, Passed, Failed int `json:"total"` } `json:"metrics"`
	} `json:"repository_after"`
	Success bool `json:"success"`
}

func main() {
	fmt.Println("============================================================")
	fmt.Println("Real-Time Order Book Engine - Evaluation")
	fmt.Println("============================================================")

	results := map[string]string{}
	passed, failed := 0, 0
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Text()
		var ev TestEvent
		if json.Unmarshal([]byte(line), &ev) != nil { continue }
		if ev.Test != "" && (ev.Action == "pass" || ev.Action == "fail") {
			if ev.Action == "pass" { results[ev.Test] = "PASSED"; passed++ } else { results[ev.Test] = "FAILED"; failed++ }
		}
	}
	total := passed + failed

	fmt.Printf("\n Evaluating repository_after...\n")
	fmt.Printf("    Passed: %d\n", passed)
	fmt.Printf("    Failed: %d\n", failed)

	projectRoot := os.Getenv("PROJECT_ROOT")
	if projectRoot == "" { cwd, _ := os.Getwd(); projectRoot = cwd }
	baseEval := filepath.Join(projectRoot, "evaluation")
	os.MkdirAll(baseEval, 0755)

	now := time.Now()
	outputDir := filepath.Join(baseEval, now.Format("2006-01-02"), now.Format("15-04-05"))
	os.MkdirAll(outputDir, 0755)

	report := Report{Timestamp: now.Format(time.RFC3339), Success: failed == 0 && total > 0}
	report.RepositoryAfter.Tests = results
	report.RepositoryAfter.Metrics.Total = total
	report.RepositoryAfter.Metrics.Passed = passed
	report.RepositoryAfter.Metrics.Failed = failed

	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(filepath.Join(outputDir, "report.json"), data, 0644)

	fmt.Printf("\n============================================================\n")
	fmt.Println("EVALUATION SUMMARY")
	fmt.Println("============================================================")
	fmt.Printf("Total Tests: %d\n", total)
	fmt.Printf("Passed: %d\n", passed)
	fmt.Printf("Failed: %d\n", failed)
	if total > 0 { fmt.Printf("Success Rate: %.1f%%\n", float64(passed)/float64(total)*100) }
	if report.Success { fmt.Println("Overall: PASS") } else { fmt.Println("Overall: FAIL") }
	fmt.Println("============================================================")

	if !report.Success { os.Exit(1) }
}
