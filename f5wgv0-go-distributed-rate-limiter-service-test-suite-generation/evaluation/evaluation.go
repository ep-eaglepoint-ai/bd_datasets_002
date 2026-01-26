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
	RunID          string    `json:"run_id"`
	StartedAt      string    `json:"started_at"`
	FinishedAt     string    `json:"finished_at"`
	DurationSeconds float64  `json:"duration_seconds"`
	Environment    Environment `json:"environment"`
	Before         RepoResult `json:"before"`
	After          RepoResult `json:"after"`
	Comparison     Comparison `json:"comparison"`
	Success        bool      `json:"success"`
	Error          *string   `json:"error"`
}

type Environment struct {
	PythonVersion string `json:"python_version"`
	Platform      string `json:"platform"`
	GoVersion     string `json:"go_version"`
}

type RepoResult struct {
	Tests   TestResult `json:"tests"`
	Metrics Metrics    `json:"metrics"`
}

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

type Metrics struct {
	// Add metrics here if needed
}

type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

// RunEvaluation runs the evaluation and returns the report as JSON bytes
func RunEvaluation() ([]byte, error) {
	report := runEvaluationInternal()
	return json.MarshalIndent(report, "", "  ")
}

func main() {
	os.Exit(runEvaluation())
}

func runEvaluation() int {
	report := runEvaluationInternal()
	if report.Error != nil {
		fmt.Fprintf(os.Stderr, "Evaluation error: %s\n", *report.Error)
	}

	// Get the current working directory
	// When running from docker-compose, we're in /app/evaluation
	// When running locally, we might be in the project root or evaluation directory
	rootDir, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get working directory: %v\n", err)
		return 1
	}

	// Determine the evaluation directory
	// Check if we're already in the evaluation directory
	var evaluationDir string
	if filepath.Base(rootDir) == "evaluation" {
		// We're in the evaluation directory, use it directly
		evaluationDir = rootDir
	} else {
		// We're in the project root, evaluation is a subdirectory
		evaluationDir = filepath.Join(rootDir, "evaluation")
		// Verify it exists
		if _, err := os.Stat(evaluationDir); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Evaluation directory not found at %s\n", evaluationDir)
			return 1
		}
	}

	// Create timestamp directory for report: evaluation/reports/<timestamp>/
	timestamp := time.Now().UTC().Format("20060102-150405")
	reportsDir := filepath.Join(evaluationDir, "reports", timestamp)
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create reports directory: %v\n", err)
		return 1
	}

	// Write report
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

	fmt.Printf("Report written to %s\n", reportPath)
	if report.Success {
		return 0
	}
	return 1
}

func runEvaluationInternal() Report {
	runID := uuid.New().String()
	startedAt := time.Now().UTC()

	env := environmentInfo()
	before := evaluate("repository_before")
	after := evaluate("repository_after")

	comparison := Comparison{
		PassedGate:         after.Tests.Passed,
		ImprovementSummary: generateImprovementSummary(before, after),
	}

	finishedAt := time.Now().UTC()
	duration := finishedAt.Sub(startedAt).Seconds()

	var errMsg *string
	if !after.Tests.Passed && before.Tests.Passed {
		msg := "After implementation failed tests while before passed"
		errMsg = &msg
	}

	return Report{
		RunID:          runID,
		StartedAt:      startedAt.Format(time.RFC3339) + "Z",
		FinishedAt:     finishedAt.Format(time.RFC3339) + "Z",
		DurationSeconds: duration,
		Environment:    env,
		Before:         before,
		After:          after,
		Comparison:     comparison,
		Success:        comparison.PassedGate,
		Error:          errMsg,
	}
}

func environmentInfo() Environment {
	goVersion := "unknown"
	if out, err := exec.Command("go", "version").Output(); err == nil {
		goVersion = strings.TrimSpace(string(out))
	}

	return Environment{
		PythonVersion: "N/A (Go evaluation)",
		Platform:      fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH),
		GoVersion:     goVersion,
	}
}

func evaluate(repoName string) RepoResult {
	currentDir, err := os.Getwd()
	if err != nil {
		return RepoResult{
			Tests: TestResult{
				Passed:     false,
				ReturnCode: -1,
				Output:     fmt.Sprintf("Failed to get working directory: %v", err),
			},
		}
	}

	// Determine project root directory
	// If we're in the evaluation directory, go up one level
	var rootDir string
	if filepath.Base(currentDir) == "evaluation" {
		rootDir = filepath.Dir(currentDir)
	} else {
		rootDir = currentDir
	}

	repoPath := filepath.Join(rootDir, repoName)
	testsPath := filepath.Join(rootDir, "tests")

	// Check if repository exists
	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		return RepoResult{
			Tests: TestResult{
				Passed:     false,
				ReturnCode: -1,
				Output:     fmt.Sprintf("Repository %s does not exist", repoName),
			},
		}
	}

	// Generate proto files for the repository
	if err := generateProto(repoPath); err != nil {
		return RepoResult{
			Tests: TestResult{
				Passed:     false,
				ReturnCode: -1,
				Output:     fmt.Sprintf("Failed to generate proto: %v", err),
			},
		}
	}

	// Run tests
	tests := runTests(repoPath, testsPath, repoName)
	metrics := runMetrics(repoPath)

	return RepoResult{
		Tests:   tests,
		Metrics: metrics,
	}
}

func generateProto(repoPath string) error {
	protoPath := filepath.Join(repoPath, "proto", "ratelimiter.proto")
	if _, err := os.Stat(protoPath); os.IsNotExist(err) {
		// No proto file, skip generation
		return nil
	}

	// Generate Go code from proto
	cmd := exec.Command("protoc",
		"--go_out=.", "--go_opt=paths=source_relative",
		"--go-grpc_out=.", "--go-grpc_opt=paths=source_relative",
		"proto/ratelimiter.proto")
	cmd.Dir = repoPath
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("protoc failed: %v, output: %s", err, string(output))
	}

	return nil
}

func runTests(repoPath, testsPath, repoName string) TestResult {
	// Update go.mod in tests to point to the correct repository
	if err := updateTestGoMod(testsPath, repoName); err != nil {
		return TestResult{
			Passed:     false,
			ReturnCode: -1,
			Output:     fmt.Sprintf("Failed to update go.mod: %v", err),
		}
	}

	// Run go mod tidy in tests directory
	cmd := exec.Command("go", "mod", "tidy")
	cmd.Dir = testsPath
	if output, err := cmd.CombinedOutput(); err != nil {
		return TestResult{
			Passed:     false,
			ReturnCode: -1,
			Output:     fmt.Sprintf("go mod tidy failed: %v, output: %s", err, string(output)),
		}
	}

	// Run tests with timeout
	cmd = exec.Command("go", "test", "-v", "-timeout", "5m", "./...")
	cmd.Dir = testsPath
	output, err := cmd.CombinedOutput()

	outputStr := string(output)
	if len(outputStr) > 8000 {
		outputStr = outputStr[:8000] + "... (truncated)"
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

	return TestResult{
		Passed:     passed,
		ReturnCode: returnCode,
		Output:     outputStr,
	}
}

func updateTestGoMod(testsPath, repoName string) error {
	goModPath := filepath.Join(testsPath, "go.mod")
	
	// Read go.mod
	content, err := os.ReadFile(goModPath)
	if err != nil {
		return err
	}

	// Replace the replace directive
	contentStr := string(content)
	oldReplace := "replace github.com/example/ratelimiter => ../repository_after"
	newReplace := fmt.Sprintf("replace github.com/example/ratelimiter => ../%s", repoName)
	
	contentStr = strings.ReplaceAll(contentStr, oldReplace, newReplace)
	
	// Also handle repository_before case
	oldReplace2 := "replace github.com/example/ratelimiter => ../repository_before"
	contentStr = strings.ReplaceAll(contentStr, oldReplace2, newReplace)

	return os.WriteFile(goModPath, []byte(contentStr), 0644)
}

func runMetrics(repoPath string) Metrics {
	// Optional metrics collection
	// For now, return empty metrics
	return Metrics{}
}

func generateImprovementSummary(before, after RepoResult) string {
	if after.Tests.Passed && !before.Tests.Passed {
		return "After implementation passed tests while before failed"
	}
	if after.Tests.Passed && before.Tests.Passed {
		return "Both implementations passed tests"
	}
	if !after.Tests.Passed && before.Tests.Passed {
		return "After implementation failed tests while before passed"
	}
	return "Both implementations failed tests"
}
