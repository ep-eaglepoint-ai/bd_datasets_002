package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TestResult struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Message string `json:"message,omitempty"`
}

type TestSuiteResult struct {
	Tests  []TestResult `json:"tests"`
	Passed int          `json:"passed"`
	Failed int          `json:"failed"`
	Total  int          `json:"total"`
	Success bool        `json:"success"`
}

type EvaluationReport struct {
	RunID      string    `json:"run_id"`
	StartedAt  string    `json:"started_at"`
	FinishedAt string    `json:"finished_at"`
	Before     BeforeResult `json:"before"`
	After      AfterResult  `json:"after"`
	Comparison ComparisonResult `json:"comparison"`
	Success    bool      `json:"success"`
}

type BeforeResult struct {
	TestsPassed        bool `json:"tests_passed"`
	ViolationsDetected bool `json:"violations_detected"`
	Tests              TestStats `json:"tests"`
}

type AfterResult struct {
	TestsPassed        bool `json:"tests_passed"`
	ThroughputVerified bool `json:"throughput_verified"`
	TimeoutsVerified   bool `json:"timeouts_verified"`
	ConcurrencyVerified bool `json:"concurrency_verified"`
	Tests              TestStats `json:"tests"`
}

type TestStats struct {
	Passed  int  `json:"passed"`
	Failed  int  `json:"failed"`
	Total   int  `json:"total"`
	Success bool `json:"success"`
}

type ComparisonResult struct {
	FailToPass []string `json:"fail_to_pass"`
	TestsFixed int      `json:"tests_fixed"`
}

func loadTestResults(filename string) (*TestSuiteResult, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var result TestSuiteResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func findFailToPassTests(before, after *TestSuiteResult) []string {
	beforeMap := make(map[string]bool)
	for _, test := range before.Tests {
		beforeMap[test.Name] = test.Passed
	}

	afterMap := make(map[string]bool)
	for _, test := range after.Tests {
		afterMap[test.Name] = test.Passed
	}

	var failToPass []string
	for testName, beforePassed := range beforeMap {
		afterPassed, exists := afterMap[testName]
		if exists && !beforePassed && afterPassed {
			failToPass = append(failToPass, testName)
		}
	}

	return failToPass
}

func generateReport(beforeFile, afterFile string) (*EvaluationReport, error) {
	startedAt := time.Now()
	runID := fmt.Sprintf("run_%d", startedAt.Unix())

	beforeResults, err := loadTestResults(beforeFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load before results: %w", err)
	}

	afterResults, err := loadTestResults(afterFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load after results: %w", err)
	}

	failToPass := findFailToPassTests(beforeResults, afterResults)

	finishedAt := time.Now()

	report := &EvaluationReport{
		RunID:      runID,
		StartedAt:  startedAt.Format(time.RFC3339),
		FinishedAt: finishedAt.Format(time.RFC3339),
		Before: BeforeResult{
			TestsPassed:        beforeResults.Success,
			ViolationsDetected: !beforeResults.Success,
			Tests: TestStats{
				Passed:  beforeResults.Passed,
				Failed:  beforeResults.Failed,
				Total:   beforeResults.Total,
				Success: beforeResults.Success,
			},
		},
		After: AfterResult{
			TestsPassed:        afterResults.Success,
			ThroughputVerified: afterResults.Success,
			TimeoutsVerified:   afterResults.Success,
			ConcurrencyVerified: afterResults.Success,
			Tests: TestStats{
				Passed:  afterResults.Passed,
				Failed:  afterResults.Failed,
				Total:   afterResults.Total,
				Success: afterResults.Success,
			},
		},
		Comparison: ComparisonResult{
			FailToPass: failToPass,
			TestsFixed: len(failToPass),
		},
		Success: afterResults.Success,
	}

	return report, nil
}

func main() {
	baseDir := "/app"
	if len(os.Args) > 1 {
		baseDir = os.Args[1]
	}

	beforeFile := filepath.Join(baseDir, "tests", "test_before_results.json")
	afterFile := filepath.Join(baseDir, "tests", "test_after_results.json")

	report, err := generateReport(beforeFile, afterFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating report: %v\n", err)
		os.Exit(1)
	}

	reportsDir := filepath.Join(baseDir, "evaluation", "reports")
	timestamp := time.Now().Format("20060102_150405")
	reportDir := filepath.Join(reportsDir, timestamp)
	
	if err := os.MkdirAll(reportDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating report directory: %v\n", err)
		os.Exit(1)
	}

	reportFile := filepath.Join(reportDir, "report.json")
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling report: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(reportFile, data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Evaluation report written to: %s\n", reportFile)
	fmt.Printf("Before: %d passed, %d failed out of %d total\n", report.Before.Tests.Passed, report.Before.Tests.Failed, report.Before.Tests.Total)
	fmt.Printf("After: %d passed, %d failed out of %d total\n", report.After.Tests.Passed, report.After.Tests.Failed, report.After.Tests.Total)
	fmt.Printf("Tests fixed: %d\n", report.Comparison.TestsFixed)
}
