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

type Report struct {
	RunID           string    `json:"run_id"`
	StartedAt      string    `json:"started_at"`
	FinishedAt     string    `json:"finished_at"`
	DurationSeconds float64  `json:"duration_seconds"`
	Environment    Environment `json:"environment"`
	MetaTests      TestResult `json:"meta_tests"`
	Success        bool      `json:"success"`
	Error          *string   `json:"error,omitempty"`
}

type Environment struct {
	GoVersion     string `json:"go_version"`
	Platform      string `json:"platform"`
	TestMode      string `json:"test_mode"`
}

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
	TestCount  int    `json:"test_count,omitempty"`
}

func main() {
	os.Exit(runEvaluation())
}

func runEvaluation() int {
	startedAt := time.Now().UTC()
	runID := startedAt.Format("20060102-150405")

	// Get project root directory
	_, filename, _, _ := runtime.Caller(0)
	evaluationDir := filepath.Dir(filename)
	rootDir := filepath.Dir(evaluationDir)
	testsDir := filepath.Join(rootDir, "tests")

	// Run meta tests
	env := environmentInfo()
	metaTests := runMetaTests(testsDir)

	finishedAt := time.Now().UTC()
	duration := finishedAt.Sub(startedAt).Seconds()

	// Determine success
	success := metaTests.Passed
	var errMsg *string
	if !success {
		msg := "Meta tests failed"
		errMsg = &msg
	}

	// Create report
	report := Report{
		RunID:          runID,
		StartedAt:      startedAt.Format(time.RFC3339),
		FinishedAt:     finishedAt.Format(time.RFC3339),
		DurationSeconds: duration,
		Environment:    env,
		MetaTests:      metaTests,
		Success:        success,
		Error:          errMsg,
	}

	// Create reports directory structure: evaluation/reports/<timestamp>/
	timestamp := startedAt.Format("20060102-150405")
	reportsDir := filepath.Join(evaluationDir, "reports", timestamp)
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create reports directory: %v\n", err)
		return 1
	}

	// Write report.json
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal report: %v\n", err)
		return 1
	}

	reportPath := filepath.Join(reportsDir, "report.json")
	if err := os.WriteFile(reportPath, reportJSON, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write report: %v\n", err)
		return 1
	}

	fmt.Printf("✓ Meta tests completed\n")
	fmt.Printf("✓ Report written to: %s\n", reportPath)
	
	if success {
		fmt.Printf("✓ Evaluation successful\n")
		return 0
	}
	
	fmt.Printf("✗ Evaluation failed\n")
	return 1
}

func environmentInfo() Environment {
	goVersion := "unknown"
	if out, err := exec.Command("go", "version").Output(); err == nil {
		goVersion = strings.TrimSpace(string(out))
	}

	testMode := os.Getenv("TEST_MODE")
	if testMode == "" {
		testMode = "default"
	}

	return Environment{
		GoVersion: goVersion,
		Platform:  fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH),
		TestMode:  testMode,
	}
}

func runMetaTests(testsPath string) TestResult {
	// Check if tests directory exists
	if _, err := os.Stat(testsPath); os.IsNotExist(err) {
		return TestResult{
			Passed:     false,
			ReturnCode: -1,
			Output:     fmt.Sprintf("Tests directory not found: %s", testsPath),
		}
	}

	// Run meta tests
	cmd := exec.Command("go", "test", "-v", "-timeout", "5m", "-run", "^TestMeta", "./...")
	cmd.Dir = testsPath
	
	output, err := cmd.CombinedOutput()
	outputStr := string(output)
	
	// Truncate output if too long
	if len(outputStr) > 10000 {
		outputStr = outputStr[:10000] + "\n... (truncated)"
	}

	returnCode := 0
	passed := true
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			returnCode = exitError.ExitCode()
		} else {
			returnCode = -1
		}
		passed = false
	}

	// Count tests from output
	testCount := strings.Count(outputStr, "PASS:") + strings.Count(outputStr, "FAIL:")

	return TestResult{
		Passed:     passed,
		ReturnCode: returnCode,
		Output:     outputStr,
		TestCount:  testCount,
	}
}
