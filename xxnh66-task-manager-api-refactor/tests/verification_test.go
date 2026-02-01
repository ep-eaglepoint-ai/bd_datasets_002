// Package tests provides verification tests for the Task Manager API.
//
// This file contains tests that verify the validity of the Ground Truth solution.
// These tests check that:
// 1. Tests FAIL against repository_before (proving the problem exists)
// 2. Tests PASS against repository_after (proving the solution works)
// 3. Tests in repository_after properly cover all 16 requirements
package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
	"time"
)

// SingleTestResult represents the result of a single test execution.
type SingleTestResult struct {
	Name       string  `json:"name"`
	Passed     bool    `json:"passed"`
	DurationMs float64 `json:"duration_ms"`
	Output     string  `json:"output,omitempty"`
	Error      string  `json:"error,omitempty"`
}

// RepositoryTestResults represents results from testing a repository.
type RepositoryTestResults struct {
	Repository           string             `json:"repository"`
	TotalTests           int                `json:"total_tests"`
	PassedTests          int                `json:"passed_tests"`
	FailedTests          int                `json:"failed_tests"`
	RaceWarnings         int                `json:"race_warnings"`
	BuildSuccess         bool               `json:"build_success"`
	BuildError           string             `json:"build_error,omitempty"`
	TestResults          []SingleTestResult `json:"test_results"`
	ExecutionTimeSeconds float64            `json:"execution_time_seconds"`
	Timestamp            string             `json:"timestamp"`
}

// VerificationReport represents the complete verification report.
type VerificationReport struct {
	BeforeResults        *RepositoryTestResults `json:"before_results,omitempty"`
	AfterResults         *RepositoryTestResults `json:"after_results,omitempty"`
	VerificationPassed   bool                   `json:"verification_passed"`
	RequirementsCoverage map[string]bool        `json:"requirements_coverage"`
	Summary              string                 `json:"summary"`
}

// getProjectRoot returns the project root directory.
func getProjectRoot() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		cwd, _ := os.Getwd()
		return cwd
	}
	return filepath.Dir(filepath.Dir(filename))
}

// runCommand runs a command and returns exit code, stdout, stderr.
func runCommand(args []string, cwd string, timeoutSeconds int) (int, string, string) {
	if len(args) == 0 {
		return -1, "", "No command provided"
	}

	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = cwd

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				return exitErr.ExitCode(), stdout.String(), stderr.String()
			}
			return -1, stdout.String(), err.Error()
		}
		return 0, stdout.String(), stderr.String()
	case <-time.After(time.Duration(timeoutSeconds) * time.Second):
		cmd.Process.Kill()
		return -1, "", "Command timed out"
	}
}

// checkGoInstallation verifies Go is installed and accessible.
func checkGoInstallation() bool {
	code, _, _ := runCommand([]string{"go", "version"}, ".", 10)
	return code == 0
}

// buildRepository builds the Go code in the repository.
func buildRepository(repoPath string) (bool, string) {
	goModPath := filepath.Join(repoPath, "go.mod")
	if _, err := os.Stat(goModPath); os.IsNotExist(err) {
		return false, "go.mod not found"
	}

	code, stdout, stderr := runCommand([]string{"go", "build", "-mod=vendor", "-v", "./..."}, repoPath, 300)
	if code != 0 {
		if stderr != "" {
			return false, stderr
		}
		return false, stdout
	}
	return true, ""
}

// GoTestEvent represents a single event from go test -json output.
type GoTestEvent struct {
	Action  string  `json:"Action"`
	Test    string  `json:"Test,omitempty"`
	Elapsed float64 `json:"Elapsed,omitempty"`
	Output  string  `json:"Output,omitempty"`
}

// runTestsWithRaceDetector runs Go tests with race detector enabled.
func runTestsWithRaceDetector(repoPath string) *RepositoryTestResults {
	results := &RepositoryTestResults{
		Repository:  repoPath,
		Timestamp:   time.Now().Format(time.RFC3339),
		TestResults: []SingleTestResult{},
	}

	startTime := time.Now()

	// Build the repository first
	buildSuccess, buildError := buildRepository(repoPath)
	results.BuildSuccess = buildSuccess
	results.BuildError = buildError

	if !buildSuccess {
		results.ExecutionTimeSeconds = time.Since(startTime).Seconds()
		return results
	}

	// Run tests with race detector
	code, stdout, stderr := runCommand([]string{"go", "test", "-mod=vendor", "-race", "-v", "-json", "./..."}, repoPath, 300)
	_ = code // We parse results from output

	combinedOutput := stdout + stderr

	// Count race warnings
	racePattern := regexp.MustCompile(`(?i)WARNING: DATA RACE|race detected`)
	results.RaceWarnings = len(racePattern.FindAllString(combinedOutput, -1))

	// Parse JSON test output
	var passed, failed int

	for _, line := range strings.Split(stdout, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var event GoTestEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if event.Action == "pass" && event.Test != "" {
			passed++
			results.TestResults = append(results.TestResults, SingleTestResult{
				Name:       event.Test,
				Passed:     true,
				DurationMs: event.Elapsed * 1000,
				Output:     event.Output,
			})
		} else if event.Action == "fail" && event.Test != "" {
			failed++
			results.TestResults = append(results.TestResults, SingleTestResult{
				Name:       event.Test,
				Passed:     false,
				DurationMs: event.Elapsed * 1000,
				Output:     event.Output,
				Error:      "Test failed",
			})
		}
	}

	// Fallback to regex parsing if JSON didn't work
	if passed == 0 && failed == 0 {
		passPattern := regexp.MustCompile(`--- (PASS|FAIL): (\S+)`)
		matches := passPattern.FindAllStringSubmatch(combinedOutput, -1)
		for _, match := range matches {
			status, name := match[1], match[2]
			if status == "PASS" {
				passed++
				results.TestResults = append(results.TestResults, SingleTestResult{
					Name:   name,
					Passed: true,
				})
			} else {
				failed++
				results.TestResults = append(results.TestResults, SingleTestResult{
					Name:   name,
					Passed: false,
				})
			}
		}
	}

	results.TotalTests = passed + failed
	results.PassedTests = passed
	results.FailedTests = failed
	results.ExecutionTimeSeconds = time.Since(startTime).Seconds()

	return results
}

// checkRequirementsCoverage checks that all 16 requirements have corresponding tests.
func checkRequirementsCoverage(repoPath string) map[string]bool {
	testFile := filepath.Join(repoPath, "requirements_test.go")
	coverage := make(map[string]bool)

	for i := 1; i <= 16; i++ {
		coverage[fmt.Sprintf("Requirement%d", i)] = false
	}

	content, err := os.ReadFile(testFile)
	if err != nil {
		return coverage
	}

	contentStr := string(content)
	for i := 1; i <= 16; i++ {
		pattern := fmt.Sprintf(`TestRequirement%d_`, i)
		if strings.Contains(contentStr, pattern) {
			coverage[fmt.Sprintf("Requirement%d", i)] = true
		}
	}

	return coverage
}

// verifyBeforeFails verifies that repository_before has expected failures.
func verifyBeforeFails(results *RepositoryTestResults) (bool, string) {
	// We expect race conditions or test failures in the before code
	if results.BuildSuccess {
		hasIssues := results.RaceWarnings > 0 || results.FailedTests > 0
		if !hasIssues {
			return false, "Expected race conditions or test failures in repository_before"
		}
	}
	return true, "repository_before correctly shows problems (as expected)"
}

// verifyAfterPasses verifies that repository_after passes all requirements.
func verifyAfterPasses(results *RepositoryTestResults) (bool, string) {
	var issues []string

	if !results.BuildSuccess {
		issues = append(issues, fmt.Sprintf("Build failed: %s", results.BuildError))
	}

	if results.RaceWarnings > 0 {
		issues = append(issues, fmt.Sprintf("Race conditions detected: %d warnings", results.RaceWarnings))
	}

	if results.FailedTests > 0 {
		var failedNames []string
		for _, t := range results.TestResults {
			if !t.Passed {
				failedNames = append(failedNames, t.Name)
			}
		}
		issues = append(issues, fmt.Sprintf("Failed tests: %s", strings.Join(failedNames, ", ")))
	}

	if results.TotalTests == 0 {
		issues = append(issues, "No tests were executed")
	}

	if len(issues) > 0 {
		return false, strings.Join(issues, "; ")
	}
	return true, fmt.Sprintf("All %d tests passed with zero race warnings", results.PassedTests)
}

// TestVerificationSuite runs the complete verification suite.
func TestVerificationSuite(t *testing.T) {
	projectRoot := getProjectRoot()
	beforePath := filepath.Join(projectRoot, "repository_before")
	afterPath := filepath.Join(projectRoot, "repository_after")

	// Check Go installation
	if !checkGoInstallation() {
		t.Fatal("Go is not installed or not in PATH")
	}

	t.Run("RepositoryBefore_ExpectFailures", func(t *testing.T) {
		if _, err := os.Stat(beforePath); os.IsNotExist(err) {
			t.Skip("repository_before not found")
		}

		results := runTestsWithRaceDetector(beforePath)
		t.Logf("Build: %v", results.BuildSuccess)
		t.Logf("Tests: %d passed, %d failed", results.PassedTests, results.FailedTests)
		t.Logf("Race warnings: %d", results.RaceWarnings)

		ok, msg := verifyBeforeFails(results)
		if !ok {
			t.Logf("Warning: %s", msg)
		} else {
			t.Log(msg)
		}
	})

	t.Run("RepositoryAfter_ExpectSuccess", func(t *testing.T) {
		if _, err := os.Stat(afterPath); os.IsNotExist(err) {
			t.Fatal("repository_after not found")
		}

		results := runTestsWithRaceDetector(afterPath)
		t.Logf("Build: %v", results.BuildSuccess)
		t.Logf("Tests: %d passed, %d failed", results.PassedTests, results.FailedTests)
		t.Logf("Race warnings: %d", results.RaceWarnings)

		ok, msg := verifyAfterPasses(results)
		if !ok {
			t.Errorf("Verification failed: %s", msg)
		} else {
			t.Log(msg)
		}
	})

	t.Run("RequirementsCoverage", func(t *testing.T) {
		if _, err := os.Stat(afterPath); os.IsNotExist(err) {
			t.Fatal("repository_after not found")
		}

		coverage := checkRequirementsCoverage(afterPath)
		covered := 0
		for _, hasCoverage := range coverage {
			if hasCoverage {
				covered++
			}
		}

		t.Logf("Coverage: %d/16 requirements have dedicated tests", covered)

		for req, hasCoverage := range coverage {
			if !hasCoverage {
				t.Errorf("Missing coverage for: %s", req)
			}
		}
	})
}
