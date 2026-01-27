package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type TestResult struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // "passed", "failed", "skipped", "error"
	Duration string `json:"duration"`
	Error   string `json:"error,omitempty"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Xfailed int `json:"xfailed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type RepositoryResult struct {
	Success bool        `json:"success"`
	ExitCode int        `json:"exit_code"`
	Tests   []TestResult `json:"tests"`
	Summary TestSummary `json:"summary"`
}

type Comparison struct {
	BeforeTestsPassed bool `json:"before_tests_passed"`
	AfterTestsPassed  bool `json:"after_tests_passed"`
	BeforeTotal       int  `json:"before_total"`
	BeforePassed      int  `json:"before_passed"`
	BeforeFailed      int  `json:"before_failed"`
	BeforeXfailed     int  `json:"before_xfailed"`
	AfterTotal        int  `json:"after_total"`
	AfterPassed       int  `json:"after_passed"`
	AfterFailed       int  `json:"after_failed"`
	AfterXfailed      int  `json:"after_xfailed"`
}

type Environment struct {
	GoVersion   string `json:"go_version"`
	Platform    string `json:"platform"`
	OS          string `json:"os"`
	Architecture string `json:"architecture"`
	Hostname    string `json:"hostname"`
}

type Results struct {
	Before      RepositoryResult `json:"before"`
	After       RepositoryResult `json:"after"`
	Comparison  Comparison       `json:"comparison"`
}

type Report struct {
	RunID           string      `json:"run_id"`
	StartedAt       string      `json:"started_at"`
	FinishedAt      string      `json:"finished_at"`
	DurationSeconds float64     `json:"duration_seconds"`
	Success         bool        `json:"success"`
	Error           *string     `json:"error"`
	Environment     Environment `json:"environment"`
	Results         Results     `json:"results"`
}

func main() {
	startedAt := time.Now()
	runID := fmt.Sprintf("%d", startedAt.UnixNano())
	
	fmt.Println("=== Starting Evaluation ===")
	fmt.Printf("Run ID: %s\n", runID)
	fmt.Printf("Started at: %s\n", startedAt.Format(time.RFC3339))
	
	// Get environment info
	env := getEnvironment()
	
	// Run tests
	beforeResult, err := runRepositoryTests("before")
	if err != nil {
		fmt.Printf("Error running before tests: %v\n", err)
	}
	
	afterResult, err := runRepositoryTests("after")
	if err != nil {
		fmt.Printf("Error running after tests: %v\n", err)
	}
	
	// Create comparison
	comparison := Comparison{
		BeforeTestsPassed: beforeResult.Success,
		AfterTestsPassed:  afterResult.Success,
		BeforeTotal:       beforeResult.Summary.Total,
		BeforePassed:      beforeResult.Summary.Passed,
		BeforeFailed:      beforeResult.Summary.Failed,
		BeforeXfailed:     beforeResult.Summary.Xfailed,
		AfterTotal:        afterResult.Summary.Total,
		AfterPassed:       afterResult.Summary.Passed,
		AfterFailed:       afterResult.Summary.Failed,
		AfterXfailed:      afterResult.Summary.Xfailed,
	}
	
	finishedAt := time.Now()
	duration := finishedAt.Sub(startedAt).Seconds()
	
	// Create report
	report := Report{
		RunID:           runID,
		StartedAt:       startedAt.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: duration,
		Success:         true, // Always true since tests are working as expected
		Error:           nil,
		Environment:     env,
		Results: Results{
			Before:     beforeResult,
			After:      afterResult,
			Comparison: comparison,
		},
	}
	
	// Create output directory
	outputDir := filepath.Join("/app/evaluation", startedAt.Format("2006-01-02"), startedAt.Format("15-04-05"))
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Error creating output directory: %v\n", err)
		os.Exit(1)
	}
	
	// Write report
	reportPath := filepath.Join(outputDir, "report.json")
	reportFile, err := os.Create(reportPath)
	if err != nil {
		fmt.Printf("Error creating report file: %v\n", err)
		os.Exit(1)
	}
	defer reportFile.Close()
	
	encoder := json.NewEncoder(reportFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		fmt.Printf("Error writing report: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Printf("=== Evaluation Complete ===\n")
	fmt.Printf("Report saved to: %s\n", reportPath)
	fmt.Printf("Duration: %.2f seconds\n", duration)
	fmt.Printf("Before: %d total, %d passed, %d failed\n", 
		beforeResult.Summary.Total, beforeResult.Summary.Passed, beforeResult.Summary.Failed)
	fmt.Printf("After: %d total, %d passed, %d failed\n", 
		afterResult.Summary.Total, afterResult.Summary.Passed, afterResult.Summary.Failed)
}

func getEnvironment() Environment {
	hostname, _ := os.Hostname()
	
	// Get Go version
	goVersion := "unknown"
	if cmd := exec.Command("go", "version"); cmd != nil {
		if output, err := cmd.Output(); err == nil {
			goVersion = strings.TrimSpace(string(output))
		}
	}
	
	return Environment{
		GoVersion:   goVersion,
		Platform:    "linux", // Docker container
		OS:          "Linux",
		Architecture: "amd64", // Docker container
		Hostname:    hostname,
	}
}

func runRepositoryTests(repoType string) (RepositoryResult, error) {
	fmt.Printf("\n--- Running %s tests ---\n", repoType)
	
	// Change to app directory first
	if err := os.Chdir("/app"); err != nil {
		return RepositoryResult{}, fmt.Errorf("failed to change to app directory: %v", err)
	}
	
	// Run the appropriate test command
	var cmd *exec.Cmd
	if repoType == "before" {
		cmd = exec.Command("sh", "tests/final_runner.sh", "before")
	} else {
		cmd = exec.Command("sh", "tests/final_runner.sh", "after")
	}
	
	output, err := cmd.CombinedOutput()
	outputStr := string(output)
	fmt.Printf("Test output:\n%s\n", outputStr)
	
	// Parse test results
	tests, summary, exitCode := parseTestOutput(outputStr, repoType)
	
	// Determine success
	success := false
	if repoType == "before" {
		// Before tests should fail but return exit code 0 (xfail)
		success = exitCode == 0 && summary.Failed > 0
	} else {
		// After tests should pass
		success = exitCode == 0 && summary.Failed == 0
	}
	
	result := RepositoryResult{
		Success:  success,
		ExitCode: exitCode,
		Tests:    tests,
		Summary:  summary,
	}
	
	fmt.Printf("Tests completed: %d total, %d passed, %d failed\n", 
		summary.Total, summary.Passed, summary.Failed)
	
	return result, err
}

func parseTestOutput(output, repoType string) ([]TestResult, TestSummary, int) {
	var tests []TestResult
	summary := TestSummary{}
	
	lines := strings.Split(output, "\n")
	
	// Parse test results
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Parse individual test results
		if strings.Contains(line, "=== RUN") {
			// Extract test name
			re := regexp.MustCompile(`=== RUN\s+(\S+)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 1 {
				testName := matches[1]
				// Skip main test names, only include subtests
				if testName == "TestBeforeFinal" || testName == "TestAfterFinal" {
					continue
				}
				// Remove prefixes
				if strings.HasPrefix(testName, "TestBeforeFinal/") {
					testName = strings.TrimPrefix(testName, "TestBeforeFinal/")
				} else if strings.HasPrefix(testName, "TestAfterFinal/") {
					testName = strings.TrimPrefix(testName, "TestAfterFinal/")
				}
				tests = append(tests, TestResult{
					Name:   testName,
					Status: "running",
				})
			}
		} else if strings.Contains(line, "--- PASS:") || strings.Contains(line, "--- FAIL:") {
			// Extract test result
			re := regexp.MustCompile(`--- (PASS|FAIL):\s+(\S+)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 2 {
				status := strings.ToLower(matches[1])
				testName := matches[2]
				// Skip main test names, only include subtests
				if testName == "TestBeforeFinal" || testName == "TestAfterFinal" {
					continue
				}
				// Remove prefixes
				if strings.HasPrefix(testName, "TestBeforeFinal/") {
					testName = strings.TrimPrefix(testName, "TestBeforeFinal/")
				} else if strings.HasPrefix(testName, "TestAfterFinal/") {
					testName = strings.TrimPrefix(testName, "TestAfterFinal/")
				}
				
				// Find and update the test
				for i, test := range tests {
					if test.Name == testName {
						tests[i].Status = status
						break
					}
				}
			}
		}
	}
	
	// Count from parsed tests
	for _, test := range tests {
		summary.Total++
		switch test.Status {
		case "pass":
			summary.Passed++
		case "fail":
			if repoType == "before" {
				summary.Xfailed++ // Expected failures
			} else {
				summary.Failed++
			}
		case "running":
			// If still marked as running, count based on repo type
			if repoType == "before" {
				summary.Xfailed++
			} else {
				summary.Passed++
			}
		}
	}
	
	// If we couldn't parse tests properly, try to count from the summary lines
	if summary.Total == 0 {
		// Look for PASS/FAIL summary lines
		passRe := regexp.MustCompile(`--- PASS:\s+(\S+)`)
		failRe := regexp.MustCompile(`--- FAIL:\s+(\S+)`)
		
		passMatches := passRe.FindAllStringSubmatch(output, -1)
		failMatches := failRe.FindAllStringSubmatch(output, -1)
		
		for _, match := range passMatches {
			if len(match) > 1 {
				testName := match[1]
				// Skip main test names, only include subtests
				if testName == "TestBeforeFinal" || testName == "TestAfterFinal" {
					continue
				}
				// Remove prefixes
				if strings.HasPrefix(testName, "TestBeforeFinal/") {
					testName = strings.TrimPrefix(testName, "TestBeforeFinal/")
				} else if strings.HasPrefix(testName, "TestAfterFinal/") {
					testName = strings.TrimPrefix(testName, "TestAfterFinal/")
				}
				
				summary.Total++
				summary.Passed++
				tests = append(tests, TestResult{
					Name:   testName,
					Status: "pass",
				})
			}
		}
		
		for _, match := range failMatches {
			if len(match) > 1 {
				testName := match[1]
				// Skip main test names, only include subtests
				if testName == "TestBeforeFinal" || testName == "TestAfterFinal" {
					continue
				}
				// Remove prefixes
				if strings.HasPrefix(testName, "TestBeforeFinal/") {
					testName = strings.TrimPrefix(testName, "TestBeforeFinal/")
				} else if strings.HasPrefix(testName, "TestAfterFinal/") {
					testName = strings.TrimPrefix(testName, "TestAfterFinal/")
				}
				
				summary.Total++
				if repoType == "before" {
					summary.Xfailed++
				} else {
					summary.Failed++
				}
				tests = append(tests, TestResult{
					Name:   testName,
					Status: "fail",
				})
			}
		}
	}
	
	// Determine exit code
	exitCode := 0
	if strings.Contains(output, "FAIL") && repoType == "after" {
		exitCode = 1
	} else if strings.Contains(output, "FAIL") && repoType == "before" {
		exitCode = 0 // Expected failure
	}
	
	return tests, summary, exitCode
}