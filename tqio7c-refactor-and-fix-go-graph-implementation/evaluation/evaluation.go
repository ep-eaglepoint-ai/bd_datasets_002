package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
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
	DurationSeconds float64 `json:"duration_seconds"`
	Before     BeforeResult `json:"before"`
	After      AfterResult  `json:"after"`
	Comparison ComparisonResult `json:"comparison"`
	Success    bool      `json:"success"`
	Error      *string   `json:"error"`
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
	PassedGate bool     `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
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

func runTests(testFile string) error {
	cmd := exec.Command("go", "run", testFile)
	cmd.Dir = "/app"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
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

	// Run test-before
	fmt.Println("Running test-before...")
	if err := runTests("tests/test_before.go"); err != nil {
		fmt.Printf("Warning: test-before exited with error: %v\n", err)
	}

	// Run test-after
	fmt.Println("Running test-after...")
	if err := runTests("tests/test_after.go"); err != nil {
		fmt.Printf("Warning: test-after exited with error: %v\n", err)
	}

	// Load results
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
	duration := finishedAt.Sub(startedAt).Seconds()

	passedGate := afterResults.Success
	improvementSummary := "After implementation passed correctness tests"
	if !passedGate {
		improvementSummary = "After implementation failed correctness tests"
	}

	report := &EvaluationReport{
		RunID:      fmt.Sprintf("run_%d", startedAt.Unix()),
		StartedAt:  startedAt.Format(time.RFC3339),
		FinishedAt: finishedAt.Format(time.RFC3339),
		DurationSeconds: duration,
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
			PassedGate: passedGate,
			ImprovementSummary: improvementSummary,
		},
		Success: passedGate,
		Error: nil,
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
		errorMsg := err.Error()
		report = &EvaluationReport{
			RunID:      fmt.Sprintf("run_%d", time.Now().Unix()),
			StartedAt:  time.Now().Format(time.RFC3339),
			FinishedAt: time.Now().Format(time.RFC3339),
			DurationSeconds: 0,
			Success: false,
			Error: &errorMsg,
		}
	}

	reportsDir := filepath.Join(baseDir, "evaluation", "reports")
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating report directory: %v\n", err)
		os.Exit(1)
	}

	reportFile := filepath.Join(reportsDir, "latest.json")
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling report: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(reportFile, data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Report written to %s\n", reportFile)
	if report.Success {
		fmt.Println("Evaluation succeeded")
	} else {
		fmt.Println("Evaluation failed")
	}

	if report.Error != nil {
		os.Exit(1)
	}
	if !report.Success {
		os.Exit(1)
	}
}
