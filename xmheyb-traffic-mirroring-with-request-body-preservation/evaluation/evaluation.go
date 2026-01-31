package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/google/uuid"
)

type Environment struct {
	GoVersion string `json:"go_version"`
	Platform      string `json:"platform"`
}

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

type Metrics map[string]interface{}

type RepositoryResult struct {
	Tests   TestResult `json:"tests"`
	Metrics Metrics    `json:"metrics"`
}

type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

type EvaluationReport struct {
	RunID          string            `json:"run_id"`
	StartedAt      string            `json:"started_at"`
	FinishedAt     string            `json:"finished_at"`
	DurationSeconds float64          `json:"duration_seconds"`
	Environment    Environment       `json:"environment"`
	Before         RepositoryResult  `json:"before"`
	After          RepositoryResult  `json:"after"`
	Comparison     Comparison        `json:"comparison"`
	Success        bool              `json:"success"`
	Error          *string           `json:"error"`
}

func getEnvironmentInfo() Environment {
	return Environment{
		GoVersion: "go " + runtime.Version(),
		Platform:      runtime.GOOS + "-" + runtime.GOARCH,
	}
}

func runTests(repoPath string) TestResult {
	// Check if tests directory exists in the project root
	testPath := filepath.Join(".", "tests")
	
	// Check if tests directory exists
	if _, err := os.Stat(testPath); os.IsNotExist(err) {
		return TestResult{
			Passed:     false,
			ReturnCode: 1,
			Output:     "no tests to run",
		}
	}

	// Run tests (same as docker compose run test)
	cmd := exec.Command("go", "test", "-v", "-race", "-count=1", "./tests/...")
	// Run from project root
	cmd.Dir = "."
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	err := cmd.Run()
	_ = time.Since(start)

	output := stdout.String() + stderr.String()
	if len(output) > 8000 {
		output = output[:8000]
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return TestResult{
				Passed:     false,
				ReturnCode: exitErr.ExitCode(),
				Output:     output,
			}
		}
		return TestResult{
			Passed:     false,
			ReturnCode: -1,
			Output:     output,
		}
	}

	return TestResult{
		Passed:     true,
		ReturnCode: 0,
		Output:     output,
	}
}

func runMetrics(repoPath string) Metrics {
	// Optional metrics implementation
	return Metrics{}
}

func evaluateRepository(repoName string) RepositoryResult {
	repoPath := filepath.Join(".", repoName)
	tests := runTests(repoPath)
	metrics := runMetrics(repoPath)
	return RepositoryResult{
		Tests:   tests,
		Metrics: metrics,
	}
}

func RunEvaluation() EvaluationReport {
	runID := uuid.New().String()
	start := time.Now()

	// Run tests for repository_after (same as docker compose run test)
	after := evaluateRepository("repository_after")

	// For before, set default values (no tests to run expected)
	before := RepositoryResult{
		Tests: TestResult{
			Passed:     false,
			ReturnCode: 1,
			Output:     "no test to run",
		},
		Metrics: Metrics{},
	}

	comparison := Comparison{
		PassedGate: after.Tests.Passed,
		ImprovementSummary: "After implementation passed correctness tests",
	}

	end := time.Now()

	return EvaluationReport{
		RunID:          runID,
		StartedAt:      start.Format(time.RFC3339),
		FinishedAt:     end.Format(time.RFC3339),
		DurationSeconds: end.Sub(start).Seconds(),
		Environment:    getEnvironmentInfo(),
		Before:         before,
		After:          after,
		Comparison:     comparison,
		Success:        comparison.PassedGate,
		Error:          nil,
	}
}

func main() {
	// Create reports directory
	reportsDir := filepath.Join(".", "evaluation", "reports")
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		println("Error creating reports directory:", err.Error())
		os.Exit(1)
	}

	report := RunEvaluation()

	// Write report
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		println("Error marshaling report:", err.Error())
		os.Exit(1)
	}

	path := filepath.Join(reportsDir, "latest.json")
	if err := os.WriteFile(path, reportJSON, 0644); err != nil {
		println("Error writing report:", err.Error())
		os.Exit(1)
	}

	println("Report written to", path)

	if report.Success {
		os.Exit(0)
	} else {
		os.Exit(1)
	}
}