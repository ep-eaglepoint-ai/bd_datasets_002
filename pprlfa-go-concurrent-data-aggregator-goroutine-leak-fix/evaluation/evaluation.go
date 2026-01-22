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

	"github.com/google/uuid"
)

type Report struct {
	RunID           string     `json:"run_id"`
	StartedAt       string     `json:"started_at"`
	FinishedAt      string     `json:"finished_at"`
	DurationSeconds float64    `json:"duration_seconds"`
	Environment     EnvInfo    `json:"environment"`
	Before          RepoResult `json:"before"`
	After           RepoResult `json:"after"`
	Comparison      Comparison `json:"comparison"`
	Success         bool       `json:"success"`
	Error           *string    `json:"error"`
}

type EnvInfo struct {
	GoVersion string `json:"go_version"`
	Platform  string `json:"platform"`
}

type RepoResult struct {
	Tests   TestResult             `json:"tests"`
	Metrics map[string]interface{} `json:"metrics"`
}

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

func getProjectRoot() string {
	wd, _ := os.Getwd()
	return filepath.Dir(wd)
}

func environmentInfo() EnvInfo {
	return EnvInfo{
		GoVersion: runtime.Version(),
		Platform:  fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
	}
}

func switchRepo(repoName string) error {
	root := getProjectRoot()
	cmd := exec.Command("go", "mod", "edit", "-replace", fmt.Sprintf("aggregator=./%s", repoName))
	cmd.Dir = root
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to switch repo to %s: %s", repoName, output)
	}
	return nil
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
		outputStr = outputStr[:8000]
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

func runMetrics(repoName string) map[string]interface{} {
	metrics := make(map[string]interface{})

	// Re-run usage of runTests implicitly handles the switching, but assuming runTests called first or we ensure switch here
	// For metrics, we essentially check the output of the tests we just ran (or run again if needed).
	// Since runTests already returns output, we can't easily parse it here without re-running or passing it.
	// For simplicity, we'll re-run or better yet, rely on the fact that if tests passed, leaks are gone (since tests assertNoLeaks).

	// Let's re-run to be safe and independent
	if err := switchRepo(repoName); err != nil {
		metrics["goroutine_leak_test_passed"] = false
		return metrics
	}

	root := getProjectRoot()
	cmd := exec.Command("go", "test", "-v", "./tests/...")
	cmd.Dir = root
	output, err := cmd.CombinedOutput()

	outputStr := string(output)

	// If tests passed (err == nil) and no "Potential goroutine leak" message
	if err == nil && !strings.Contains(outputStr, "Potential goroutine leak") {
		metrics["goroutine_leak_test_passed"] = true
	} else {
		metrics["goroutine_leak_test_passed"] = false
	}

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
	metrics := runMetrics(repoName)

	return RepoResult{
		Tests:   tests,
		Metrics: metrics,
	}
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

	before = evaluate("repository_before")
	after = evaluate("repository_after")

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

	comparison.PassedGate = after.Tests.Passed

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
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, reportJSON, 0644)

	fmt.Printf("Report written to %s\n", reportPath)

	fmt.Println("\n=== Evaluation Summary ===")
	fmt.Printf("Before tests passed: %v\n", report.Before.Tests.Passed)
	fmt.Printf("After tests passed: %v\n", report.After.Tests.Passed)
	fmt.Printf("Success: %v\n", report.Success)
	if report.Error != nil {
		fmt.Printf("Error: %s\n", *report.Error)
	}

	if !report.Success {
		os.Exit(1)
	}
}
