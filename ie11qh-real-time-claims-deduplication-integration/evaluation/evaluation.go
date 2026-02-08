package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// TestResult represents a single test result
type TestResult struct {
	Name            string        `json:"name"`
	Status          string        `json:"status"`
	Duration        int64         `json:"duration"`
	FailureMessages []string      `json:"failureMessages"`
}

// TestSummary represents test summary statistics
type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Xfailed int `json:"xfailed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

// AfterResults represents the test results for the "after" state
type AfterResults struct {
	Success  bool          `json:"success"`
	ExitCode int           `json:"exit_code"`
	Tests    []TestResult  `json:"tests"`
	Summary  TestSummary   `json:"summary"`
}

// Comparison represents comparison metrics
type Comparison struct {
	AfterTestsPassed bool `json:"after_tests_passed"`
	AfterTotal        int  `json:"after_total"`
	AfterPassed       int  `json:"after_passed"`
	AfterFailed       int  `json:"after_failed"`
	AfterXfailed      int  `json:"after_xfailed"`
}

// Results represents the overall results section
type Results struct {
	After       AfterResults `json:"after"`
	Comparison  Comparison   `json:"comparison"`
}

// Environment represents environment information
type Environment struct {
	GoVersion   string `json:"go_version"`
	Platform    string `json:"platform"`
	OS          string `json:"os"`
	Architecture string `json:"architecture"`
	Hostname    string `json:"hostname"`
}

// EvaluationReport represents the complete evaluation report
type EvaluationReport struct {
	RunID          string      `json:"run_id"`
	StartedAt      string      `json:"started_at"`
	FinishedAt     string      `json:"finished_at"`
	DurationSeconds float64    `json:"duration_seconds"`
	Success        bool        `json:"success"`
	Error          interface{} `json:"error"`
	Environment    Environment `json:"environment"`
	Results        Results     `json:"results"`
}

// TestOutput represents parsed test output
type TestOutput struct {
	Results []TestResult
	Summary TestSummary
	Success bool
}

func main() {
	startTime := time.Now()
	
	// Generate run ID
	runID := fmt.Sprintf("%d", startTime.UnixNano())
	
	// Get environment info
	env := Environment{
		GoVersion:    runtime.Version(),
		Platform:    runtime.GOOS,
		OS:          runtime.GOOS,
		Architecture: runtime.GOARCH,
		Hostname:    getHostname(),
	}
	
	// Run tests
	testOutput, err := runTests()
	if err != nil {
		fmt.Printf("Error running tests: %v\n", err)
		os.Exit(1)
	}
	
	finishTime := time.Now()
	duration := finishTime.Sub(startTime).Seconds()
	
	// Create report
	report := EvaluationReport{
		RunID:          runID,
		StartedAt:      startTime.UTC().Format(time.RFC3339),
		FinishedAt:     finishTime.UTC().Format(time.RFC3339),
		DurationSeconds: duration,
		Success:        testOutput.Success,
		Error:          nil,
		Environment:    env,
		Results: Results{
			After: AfterResults{
				Success:  testOutput.Success,
				ExitCode: 0,
				Tests:    testOutput.Results,
				Summary:  testOutput.Summary,
			},
			Comparison: Comparison{
				AfterTestsPassed: testOutput.Success,
				AfterTotal:        testOutput.Summary.Total,
				AfterPassed:       testOutput.Summary.Passed,
				AfterFailed:       testOutput.Summary.Failed,
				AfterXfailed:      testOutput.Summary.Xfailed,
			},
		},
	}
	
	// Create output directory
	outputDir := filepath.Join("/app/evaluation", startTime.Format("2006-01-02"), startTime.Format("15-04-05"))
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Error creating output directory: %v\n", err)
		os.Exit(1)
	}
	
	// Write report
	reportPath := filepath.Join(outputDir, "report.json")
	reportData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling report: %v\n", err)
		os.Exit(1)
	}
	
	if err := os.WriteFile(reportPath, reportData, 0644); err != nil {
		fmt.Printf("Error writing report: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Printf("Evaluation completed successfully!\n")
	fmt.Printf("Report saved to: %s\n", reportPath)
	fmt.Printf("Duration: %.2f seconds\n", duration)
	fmt.Printf("Tests: %d total, %d passed, %d failed\n", 
		testOutput.Summary.Total, testOutput.Summary.Passed, testOutput.Summary.Failed)
}

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func runTests() (*TestOutput, error) {
	// Change to tests directory
	if err := os.Chdir("tests"); err != nil {
		return nil, fmt.Errorf("failed to change to tests directory: %v", err)
	}
	
	// Run go test with JSON output
	cmd := exec.Command("go", "test", "-v", ".")
	cmd.Env = os.Environ()
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Tests failed, but we still want to parse the output
		fmt.Printf("Tests failed with error: %v\n", err)
	}
	
	return parseTestOutput(string(output))
}

func parseTestOutput(output string) (*TestOutput, error) {
	lines := strings.Split(output, "\n")
	
	var results []TestResult
	var summary TestSummary
	success := true
	
	// Parse test results
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// Parse individual test results
		if strings.Contains(line, "=== RUN") {
			// Extract test name
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				testName := strings.Join(parts[2:], " ")
				results = append(results, TestResult{
					Name:            testName,
					Status:          "passed", // Default to passed, will update if failed
					Duration:        0,
					FailureMessages: []string{},
				})
			}
		} else if strings.Contains(line, "--- PASS:") {
			// Update last test as passed
			if len(results) > 0 {
				results[len(results)-1].Status = "passed"
			}
		} else if strings.Contains(line, "--- FAIL:") {
			// Update last test as failed
			if len(results) > 0 {
				results[len(results)-1].Status = "failed"
				success = false
			}
		}
	}
	
	// Parse summary from PASS/FAIL line
	for _, line := range lines {
		if strings.Contains(line, "PASS") || strings.Contains(line, "FAIL") {
			if strings.Contains(line, "ok") {
				// Extract summary information
				fields := strings.Fields(line)
				for i, field := range fields {
					if field == "ok" && i+1 < len(fields) {
						// Parse test count from the next field if it contains time info
						timeField := fields[i+1]
						if strings.Contains(timeField, "s") {
							// This is time info, look for test count in other fields
							for _, f := range fields {
								if strings.Contains(f, "claims-deduplication") {
									// Extract test count from package name if available
									continue
								}
							}
						}
					}
				}
			}
		}
	}
	
	// Calculate summary from results
	summary.Total = len(results)
	for _, result := range results {
		switch result.Status {
		case "passed":
			summary.Passed++
		case "failed":
			summary.Failed++
		}
	}
	
	// If we have test results but summary is empty, use results count
	if summary.Total == 0 && len(results) > 0 {
		summary.Total = len(results)
		summary.Passed = summary.Total
		if !success {
			summary.Failed = 1
			summary.Passed = summary.Total - 1
		}
	}
	
	return &TestOutput{
		Results: results,
		Summary: summary,
		Success: success,
	}, nil
}
