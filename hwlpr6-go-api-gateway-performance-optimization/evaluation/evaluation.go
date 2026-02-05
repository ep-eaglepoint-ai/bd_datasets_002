package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
)

// InstanceConfig represents the instance.json structure
type InstanceConfig struct {
	InstanceID      string   `json:"instance_id"`
	ProblemStatement string  `json:"problem_statement"`
	BaseCommit      string   `json:"base_commit"`
	TestPatch       string   `json:"test_patch"`
	Repo            string   `json:"repo"`
	EnvironmentSetup string  `json:"environment_setup"`
	FAIL_TO_PASS    []string `json:"FAIL_TO_PASS"`
	PASS_TO_PASS    []string `json:"PASS_TO_PASS"`
}

// Report represents the standard evaluation report structure
type Report struct {
	RunID           string     `json:"run_id"`
	StartedAt       string     `json:"started_at"`
	FinishedAt      string     `json:"finished_at"`
	DurationSeconds float64    `json:"duration_seconds"`
	Environment     EnvInfo    `json:"environment"`
	Before          RepoResult `json:"before"`
	After           RepoResult `json:"after"`
	Comparison      Comparison  `json:"comparison"`
	Success         bool       `json:"success"`
	Error           *string    `json:"error"`
}

// EnvInfo represents environment information
type EnvInfo struct {
	GoVersion string `json:"go_version"`
	Platform  string `json:"platform"`
}

// RepoResult represents test results and metrics for a repository
type RepoResult struct {
	Tests   TestResult             `json:"tests"`
	Metrics map[string]interface{} `json:"metrics"`
}

// TestResult represents test execution results
type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

// Comparison represents the comparison between before and after
type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

// TestStatus represents individual test status
type TestStatus struct {
	Name   string
	Passed bool
}

func getProjectRoot() string {
	wd, _ := os.Getwd()
	// If we're in evaluation directory, go up one level
	if strings.HasSuffix(wd, "evaluation") {
		return filepath.Dir(wd)
	}
	return wd
}

func environmentInfo() EnvInfo {
	return EnvInfo{
		GoVersion: runtime.Version(),
		Platform:  fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
	}
}

func loadInstanceConfig() (*InstanceConfig, error) {
	root := getProjectRoot()
	instancePath := filepath.Join(root, "instances", "instance.json")
	
	data, err := os.ReadFile(instancePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read instance.json: %w", err)
	}
	
	var config InstanceConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse instance.json: %w", err)
	}
	
	return &config, nil
}

func switchRepo(repoName string) error {
	root := getProjectRoot()
	cmd := exec.Command("go", "mod", "edit", "-replace", fmt.Sprintf("gateway=./%s", repoName))
	cmd.Dir = root
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to switch repo to %s: %s", repoName, output)
	}
	
	// Run go mod tidy to ensure dependencies are resolved
	cmd = exec.Command("go", "mod", "tidy")
	cmd.Dir = root
	if _, err := cmd.CombinedOutput(); err != nil {
		// Non-fatal, continue
	}
	
	return nil
}

func parseTestOutput(output string) map[string]bool {
	testResults := make(map[string]bool)
	
	// Pattern to match test results: "--- PASS: TestName" or "--- FAIL: TestName"
	passPattern := regexp.MustCompile(`--- PASS:\s+(\S+)`)
	failPattern := regexp.MustCompile(`--- FAIL:\s+(\S+)`)
	
	// Find all passing tests
	for _, matches := range passPattern.FindAllStringSubmatch(output, -1) {
		if len(matches) > 1 {
			testResults[matches[1]] = true
		}
	}
	
	// Find all failing tests
	for _, matches := range failPattern.FindAllStringSubmatch(output, -1) {
		if len(matches) > 1 {
			testResults[matches[1]] = false
		}
	}
	
	// Also handle subtests (e.g., "TestName/SubtestName")
	subtestPassPattern := regexp.MustCompile(`\s+--- PASS:\s+(\S+)`)
	subtestFailPattern := regexp.MustCompile(`\s+--- FAIL:\s+(\S+)`)
	
	for _, matches := range subtestPassPattern.FindAllStringSubmatch(output, -1) {
		if len(matches) > 1 {
			testResults[matches[1]] = true
		}
	}
	
	for _, matches := range subtestFailPattern.FindAllStringSubmatch(output, -1) {
		if len(matches) > 1 {
			testResults[matches[1]] = false
		}
	}
	
	return testResults
}

func runTests(repoName string) TestResult {
	if err := switchRepo(repoName); err != nil {
		return TestResult{
			Passed:     false,
			ReturnCode: -1,
			Output:     err.Error(),
		}
	}

	root := getProjectRoot()
	// Run all tests in the tests directory
	cmd := exec.Command("go", "test", "-v", "./tests/...")
	cmd.Dir = root
	output, err := cmd.CombinedOutput()

	outputStr := string(output)
	if len(outputStr) > 8000 {
		outputStr = outputStr[:8000] + "... (truncated)"
	}

	returnCode := 0
	passed := true
	if err != nil {
		passed = false
		if exitError, ok := err.(*exec.ExitError); ok {
			returnCode = exitError.ExitCode()
		} else {
			returnCode = -1
		}
	}

	return TestResult{
		Passed:     passed,
		ReturnCode: returnCode,
		Output:     outputStr,
	}
}

func runMetrics(repoName string, testOutput string) map[string]interface{} {
	metrics := make(map[string]interface{})
	
	// Check for goroutine leaks in output
	if strings.Contains(testOutput, "Goroutine leak detected") || 
	   strings.Contains(testOutput, "Potential goroutine leak") {
		metrics["goroutine_leak_detected"] = true
	} else {
		metrics["goroutine_leak_detected"] = false
	}
	
	// Count test failures
	failCount := strings.Count(testOutput, "--- FAIL:")
	metrics["test_failures"] = failCount
	
	// Count test passes
	passCount := strings.Count(testOutput, "--- PASS:")
	metrics["test_passes"] = passCount
	
	return metrics
}

func evaluate(repoName string) RepoResult {
	root := getProjectRoot()
	repoPath := filepath.Join(root, repoName)

	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		return RepoResult{
			Tests: TestResult{
				Passed:     false,
				ReturnCode: -1,
				Output:     fmt.Sprintf("Repository %s does not exist", repoName),
			},
			Metrics: make(map[string]interface{}),
		}
	}

	tests := runTests(repoName)
	metrics := runMetrics(repoName, tests.Output)

	return RepoResult{
		Tests:   tests,
		Metrics: metrics,
	}
}

func verifyTestRequirements(beforeResult, afterResult RepoResult, config *InstanceConfig) (bool, string) {
	beforeTests := parseTestOutput(beforeResult.Tests.Output)
	afterTests := parseTestOutput(afterResult.Tests.Output)
	
	var issues []string
	
	// Verify FAIL_TO_PASS tests: should fail in before, pass in after
	for _, testName := range config.FAIL_TO_PASS {
		beforePassed, beforeExists := beforeTests[testName]
		afterPassed, afterExists := afterTests[testName]
		
		if !beforeExists {
			issues = append(issues, fmt.Sprintf("FAIL_TO_PASS test '%s' not found in before output", testName))
		} else if beforePassed {
			issues = append(issues, fmt.Sprintf("FAIL_TO_PASS test '%s' unexpectedly passed in before", testName))
		}
		
		if !afterExists {
			issues = append(issues, fmt.Sprintf("FAIL_TO_PASS test '%s' not found in after output", testName))
		} else if !afterPassed {
			issues = append(issues, fmt.Sprintf("FAIL_TO_PASS test '%s' failed in after (expected to pass)", testName))
		}
	}
	
	// Verify PASS_TO_PASS tests: should pass in both
	for _, testName := range config.PASS_TO_PASS {
		beforePassed, beforeExists := beforeTests[testName]
		afterPassed, afterExists := afterTests[testName]
		
		if !beforeExists {
			issues = append(issues, fmt.Sprintf("PASS_TO_PASS test '%s' not found in before output", testName))
		} else if !beforePassed {
			issues = append(issues, fmt.Sprintf("PASS_TO_PASS test '%s' failed in before (expected to pass)", testName))
		}
		
		if !afterExists {
			issues = append(issues, fmt.Sprintf("PASS_TO_PASS test '%s' not found in after output", testName))
		} else if !afterPassed {
			issues = append(issues, fmt.Sprintf("PASS_TO_PASS test '%s' failed in after (expected to pass)", testName))
		}
	}
	
	if len(issues) > 0 {
		return false, strings.Join(issues, "; ")
	}
	
	return true, "All test requirements verified"
}

func runEvaluation() Report {
	runID := uuid.New().String()
	start := time.Now().UTC()

	var before, after RepoResult
	var comparison Comparison
	var errStr *string

	defer func() {
		if r := recover(); r != nil {
			errMsg := fmt.Sprintf("%v", r)
			errStr = &errMsg
			before = RepoResult{
				Tests:   TestResult{Passed: false, ReturnCode: -1, Output: ""},
				Metrics: make(map[string]interface{}),
			}
			after = RepoResult{
				Tests:   TestResult{Passed: false, ReturnCode: -1, Output: ""},
				Metrics: make(map[string]interface{}),
			}
			comparison = Comparison{
				PassedGate:         false,
				ImprovementSummary: "Evaluation crashed",
			}
		}
	}()

	// Load instance configuration
	config, err := loadInstanceConfig()
	if err != nil {
		errMsg := err.Error()
		errStr = &errMsg
		before = RepoResult{
			Tests:   TestResult{Passed: false, ReturnCode: -1, Output: err.Error()},
			Metrics: make(map[string]interface{}),
		}
		after = RepoResult{
			Tests:   TestResult{Passed: false, ReturnCode: -1, Output: err.Error()},
			Metrics: make(map[string]interface{}),
		}
		comparison = Comparison{
			PassedGate:         false,
			ImprovementSummary: "Failed to load instance configuration",
		}
	} else {
		before = evaluate("repository_before")
		after = evaluate("repository_after")

		// Verify test requirements from instance.json
		requirementsMet, reqSummary := verifyTestRequirements(before, after, config)

		// Determine improvement summary
		if after.Tests.Passed && !before.Tests.Passed {
			comparison.ImprovementSummary = "After implementation passed correctness tests while before failed"
		} else if after.Tests.Passed && before.Tests.Passed {
			comparison.ImprovementSummary = "Both implementations passed tests, but after fixes goroutine leaks"
		} else if !after.Tests.Passed {
			comparison.ImprovementSummary = "After implementation failed tests - needs review"
		} else {
			comparison.ImprovementSummary = "Before passed but after failed - regression detected"
		}

		if !requirementsMet {
			comparison.ImprovementSummary += ". " + reqSummary
		}

		// Success rule: after.tests.passed == true
		comparison.PassedGate = after.Tests.Passed && requirementsMet
	}

	end := time.Now().UTC()

	return Report{
		RunID:           runID,
		StartedAt:       start.Format(time.RFC3339) + "Z",
		FinishedAt:      end.Format(time.RFC3339) + "Z",
		DurationSeconds: end.Sub(start).Seconds(),
		Environment:     environmentInfo(),
		Before:          before,
		After:           after,
		Comparison:      comparison,
		Success:         comparison.PassedGate,
		Error:           errStr,
	}
}

func main() {
	root := getProjectRoot()
	reportsDir := filepath.Join(root, "evaluation", "reports")
	os.MkdirAll(reportsDir, 0755)

	report := runEvaluation()

	// Write to timestamped directory structure: YYYY-MM-DD/HH-MM-SS/report.json
	now := time.Now().UTC()
	dateDir := now.Format("2006-01-02")
	timeDir := now.Format("15-04-05")
	reportDir := filepath.Join(reportsDir, dateDir, timeDir)
	os.MkdirAll(reportDir, 0755)

	reportPath := filepath.Join(reportDir, "report.json")
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal report: %v\n", err)
		os.Exit(1)
	}
	
	if err := os.WriteFile(reportPath, reportJSON, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Report written to %s\n", reportPath)

	fmt.Println("\n=== Evaluation Summary ===")
	fmt.Printf("Before tests passed: %v\n", report.Before.Tests.Passed)
	fmt.Printf("After tests passed: %v\n", report.After.Tests.Passed)
	fmt.Printf("Success: %v\n", report.Success)
	fmt.Printf("Improvement Summary: %s\n", report.Comparison.ImprovementSummary)
	if report.Error != nil {
		fmt.Printf("Error: %s\n", *report.Error)
	}

	if !report.Success {
		os.Exit(1)
	}
	os.Exit(0)
}