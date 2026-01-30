// evaluation.go - Standard evaluation script for robotic-arm-actuator-logic-refactor
// Compares repository_before and repository_after test results

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

const (
	ReportsDir = "evaluation/reports"
)

type EnvironmentInfo struct {
	PythonVersion string `json:"python_version"`
	Platform      string `json:"platform"`
}

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

type Metrics struct {
	// No metrics collected by default
}

type RepositoryResult struct {
	Tests   TestResult `json:"tests"`
	Metrics Metrics    `json:"metrics"`
}

type Comparison struct {
	PassedGate        bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

type EvaluationReport struct {
	RunID            string            `json:"run_id"`
	StartedAt        string            `json:"started_at"`
	FinishedAt       string            `json:"finished_at"`
	DurationSeconds  float64           `json:"duration_seconds"`
	Environment      EnvironmentInfo   `json:"environment"`
	Before           RepositoryResult  `json:"before"`
	After            RepositoryResult  `json:"after"`
	Comparison       Comparison        `json:"comparison"`
	Success          bool              `json:"success"`
	Error            *string           `json:"error"`
}

func getEnvironmentInfo() EnvironmentInfo {
	return EnvironmentInfo{
		PythonVersion: runtime.Version(),
		Platform:      runtime.GOOS + "-" + runtime.GOARCH,
	}
}

func runTests(repoName string) TestResult {
	// Modify go.mod to point to the correct repository
	goModPath := filepath.Join("go.mod")
	content, err := os.ReadFile(goModPath)
	if err != nil {
		return TestResult{
			Passed:     false,
			ReturnCode: 1,
			Output:     fmt.Sprintf("Error reading go.mod: %v", err),
		}
	}

	originalContent := string(content)
	var modifiedContent string

	if repoName == "repository_before" {
		modifiedContent = strings.ReplaceAll(originalContent, "./repository_after", "./repository_before")
	} else {
		modifiedContent = strings.ReplaceAll(originalContent, "./repository_before", "./repository_after")
	}

	err = os.WriteFile(goModPath, []byte(modifiedContent), 0644)
	if err != nil {
		return TestResult{
			Passed:     false,
			ReturnCode: 1,
			Output:     fmt.Sprintf("Error writing go.mod: %v", err),
		}
	}

	// Restore on exit
	defer func() {
		os.WriteFile(goModPath, []byte(originalContent), 0644)
	}()

	// Run Go tests
	cmd := exec.Command("go", "test", "-v", "./...")
	cmd.Dir = "."

	output, err := cmd.CombinedOutput()

	outputStr := string(output)
	if len(outputStr) > 8000 {
		outputStr = outputStr[:8000]
	}

	// Get return code from command
	returnCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			returnCode = exitErr.ExitCode()
		} else {
			returnCode = 1
		}
	}

	return TestResult{
		Passed:     returnCode == 0,
		ReturnCode: returnCode,
		Output:     outputStr,
	}
}

func countPassedTests(output string) int {
	// Count "--- PASS:" lines in output
	re := regexp.MustCompile(`--- PASS:`)
	return len(re.FindAllStringIndex(output, -1))
}

func evaluateRepo(repoName string) RepositoryResult {
	tests := runTests(repoName)
	return RepositoryResult{
		Tests:   tests,
		Metrics: Metrics{},
	}
}

func runEvaluation() EvaluationReport {
	runID := uuid.New().String()
	startTime := time.Now().UTC()

	before := evaluateRepo("repository_before")
	after := evaluateRepo("repository_after")

	afterPassed := after.Tests.Passed
	improvementSummary := ""

	if afterPassed {
		improvementSummary = "After implementation passed all correctness tests"
	} else {
		beforePassCount := countPassedTests(before.Tests.Output)
		afterPassCount := countPassedTests(after.Tests.Output)
		improvementSummary = fmt.Sprintf("After: %d passed, Before: %d passed", afterPassCount, beforePassCount)
	}

	comparison := Comparison{
		PassedGate:        afterPassed,
		ImprovementSummary: improvementSummary,
	}

	endTime := time.Now().UTC()
	duration := endTime.Sub(startTime).Seconds()

	return EvaluationReport{
		RunID:           runID,
		StartedAt:       startTime.Format(time.RFC3339),
		FinishedAt:      endTime.Format(time.RFC3339),
		DurationSeconds: duration,
		Environment:     getEnvironmentInfo(),
		Before:          before,
		After:           after,
		Comparison:      comparison,
		Success:         comparison.PassedGate,
		Error:           nil,
	}
}

func main() {
	// Ensure reports directory exists
	err := os.MkdirAll(ReportsDir, 0755)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating reports directory: %v\n", err)
		os.Exit(1)
	}

	report := runEvaluation()

	// Write report to latest.json
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling report: %v\n", err)
		os.Exit(1)
	}

	reportPath := filepath.Join(ReportsDir, "latest.json")
	err = os.WriteFile(reportPath, reportJSON, 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error writing report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Report written to %s\n", reportPath)

	// Print summary
	fmt.Println("\n=== Evaluation Summary ===")
	fmt.Printf("Run ID: %s\n", report.RunID)
	if report.Before.Tests.Passed {
		fmt.Println("Before: PASSED")
	} else {
		fmt.Println("Before: FAILED")
	}
	if report.After.Tests.Passed {
		fmt.Println("After: PASSED")
	} else {
		fmt.Println("After: FAILED")
	}
	fmt.Printf("Success: %t\n", report.Success)
	fmt.Printf("Duration: %.3fs\n", report.DurationSeconds)

	if report.Success {
		os.Exit(0)
	} else {
		os.Exit(1)
	}
}
