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
)

// Constants
const (
	ReportsDir = "evaluation/reports"
)

// Structures matching the TypeScript interfaces

type TestResult struct {
	Passed     bool   `json:"passed"`
	ReturnCode int    `json:"return_code"`
	Output     string `json:"output"`
}

type Metrics struct {
	GoFileCount int    `json:"go_file_count"`
	LinesOfCode int    `json:"lines_of_code"`
	Error       string `json:"error,omitempty"`
}

type EvaluationResult struct {
	Tests   TestResult `json:"tests"`
	Metrics Metrics    `json:"metrics"`
}

type EnvironmentInfo struct {
	GoVersion string `json:"go_version"`
	Platform  string `json:"platform"`
}

type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

type Report struct {
	RunID           string           `json:"run_id"`
	StartedAt       string           `json:"started_at"`
	FinishedAt      string           `json:"finished_at"`
	DurationSeconds float64          `json:"duration_seconds"`
	Environment     EnvironmentInfo  `json:"environment"`
	Before          EvaluationResult `json:"before"`
	After           EvaluationResult `json:"after"`
	Comparison      Comparison       `json:"comparison"`
	Success         bool             `json:"success"`
	Error           string           `json:"error,omitempty"`
}

// Helper functions

func getEnvironmentInfo() EnvironmentInfo {
	return EnvironmentInfo{
		GoVersion: runtime.Version(),
		Platform:  fmt.Sprintf("%s %s", runtime.GOOS, runtime.GOARCH),
	}
}

func runCommand(commandStr string) TestResult {
	// Split command string for exec.Command
	// Note: Strings like 'sh -c "..."' need careful parsing if just splitting by space.
	// We'll simplisticly handle the sh -c case or use shell directly if needed.
	
	var cmd *exec.Cmd
	if strings.HasPrefix(commandStr, "sh -c") {
		// Extract the actual command string inside quotes
		// This is a naive parser for the specific command strings we hardcoded
		prefix := "sh -c \""
		if strings.HasPrefix(commandStr, prefix) && strings.HasSuffix(commandStr, "\"") {
			innerCmd := commandStr[len(prefix) : len(commandStr)-1]
			cmd = exec.Command("sh", "-c", innerCmd)
		} else {
            // Fallback for docker compose commands or others
            parts := strings.Fields(commandStr)
            cmd = exec.Command(parts[0], parts[1:]...)
        }
	} else {
		parts := strings.Fields(commandStr)
		cmd = exec.Command(parts[0], parts[1:]...)
	}
	
	// Capture both stdout and stderr
	outputBytes, err := cmd.CombinedOutput()
	output := string(outputBytes)

	returnCode := 0
	passed := true
	if err != nil {
		passed = false
		if exitError, ok := err.(*exec.ExitError); ok {
			returnCode = exitError.ExitCode()
		} else {
			returnCode = 1
		}
	}

	// Truncate output if too long
	truncatedOutput := output
	if len(output) > 20000 {
		truncatedOutput = output[:4000] + "\n...[truncated]...\n" + output[len(output)-16000:]
	}

	return TestResult{
		Passed:     passed,
		ReturnCode: returnCode,
		Output:     truncatedOutput,
	}
}

func runMetrics(repoPathStr string) Metrics {
	metrics := Metrics{
		GoFileCount: 0,
		LinesOfCode: 0,
	}

	_, err := os.Stat(repoPathStr)
	if os.IsNotExist(err) {
		return metrics
	}

	err = filepath.Walk(repoPathStr, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
			metrics.GoFileCount++
			content, err := os.ReadFile(path)
			if err == nil {
				lines := strings.Split(string(content), "\n")
				metrics.LinesOfCode += len(lines)
			}
		}
		return nil
	})

	if err != nil {
		metrics.Error = err.Error()
	}

	return metrics
}

func evaluate(repoName string, localMode bool) EvaluationResult {
	// Determine command based on repo name
	var cmd string
	if localMode {
		if repoName == "repository_before" {
			cmd = `sh -c "mkdir -p /tmp/before && cp -r repository_before/* /tmp/before/ && cp tests/requirements_test.go /tmp/before/ && cd /tmp/before && (go mod init before_app || true) && go get . && go test -v -race"`
		} else if repoName == "repository_after" {
			cmd = `sh -c "mkdir -p /tmp/after && cp -r repository_after/* /tmp/after/ && rm /tmp/after/shortener_test.go && cp tests/requirements_test.go /tmp/after/ && cd /tmp/after && go get . && go test -v -race"`
		}
	} else {
		if repoName == "repository_before" {
			cmd = "docker compose run test-before"
		} else if repoName == "repository_after" {
			cmd = "docker compose run test-after"
		}
	}
	
	if cmd == "" {
		return EvaluationResult{
			Tests: TestResult{
				Passed: false,
				Output: "Unknown repository name for evaluation",
			},
		}
	}

	fmt.Printf("Running evaluation for %s (local: %v)...\n", repoName, localMode)
	testResult := runCommand(cmd)
	
	cwd, _ := os.Getwd()
	repoPath := filepath.Join(cwd, repoName)
	metrics := runMetrics(repoPath)

	return EvaluationResult{
		Tests:   testResult,
		Metrics: metrics,
	}
}

func parseGoTestOutput(outputStr string) (int, int, bool) {
	passed := 0
	failed := 0
	buildFailed := false

	// Regex to match "--- PASS: TestName" and "--- FAIL: TestName"
	passRegex := regexp.MustCompile(`--- PASS:`)
	failRegex := regexp.MustCompile(`--- FAIL:`)
	buildFailRegex := regexp.MustCompile(`\[build failed\]`)

	passed = len(passRegex.FindAllString(outputStr, -1))
	failed = len(failRegex.FindAllString(outputStr, -1))
	
	if buildFailRegex.MatchString(outputStr) {
		buildFailed = true
	}

	return passed, failed, buildFailed
}

func printReport(report Report, reportPath string) {
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("EVALUATION RESULTS")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println()
	fmt.Printf("Run ID: %s\n", report.RunID)
	fmt.Printf("Duration: %.2f seconds\n", report.DurationSeconds)
	fmt.Println()

	beforePass, beforeFail, beforeBuildFail := parseGoTestOutput(report.Before.Tests.Output)
	afterPass, afterFail, afterBuildFail := parseGoTestOutput(report.After.Tests.Output)

	// Calculate total expected tests from the 'after' run if available
	totalTests := afterPass + afterFail
	// If detection fails or after also failed build (unlikely in this context but possible), default 'failed' count for build error to 0 or we can treat build failure as 1 unit of failure.
	// However, user specifically asked for "Failed: 13" style if possible.
	beforeFailedCount := beforeFail
	if beforeBuildFail {
		// If we know there are totalTests from the comparison, assume all failed.
		if totalTests > 0 {
			beforeFailedCount = totalTests
		}
	}

	fmt.Println("BEFORE (repository_before):")
	fmt.Printf("  Tests passed execution: %t\n", report.Before.Tests.Passed)
	if beforeBuildFail {
		// Display build failure as total failure
		fmt.Printf("  Passed: 0 | Failed: %d\n", beforeFailedCount)
	} else {
		fmt.Printf("  Passed: %d | Failed: %d\n", beforePass, beforeFail)
	}

	fmt.Println()
	fmt.Println("AFTER (repository_after):")
	fmt.Printf("  Tests passed execution: %t\n", report.After.Tests.Passed)
	if afterBuildFail {
		fmt.Println("  Status: Build Failed (Compilation Error)")
	} else {
		fmt.Printf("  Passed: %d | Failed: %d\n", afterPass, afterFail)
	}
	fmt.Println()
	
	fmt.Println("COMPARISON:")
	fmt.Printf("  Passed gate: %t\n", report.Comparison.PassedGate)
	fmt.Printf("  Summary: %s\n", report.Comparison.ImprovementSummary)
	fmt.Println()
	
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("SUCCESS: %t\n", report.Success)
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println()
	fmt.Printf("Report written to %s\n", reportPath)
}

func main() {
	start := time.Now()
	
	// Check for --local flag
	localMode := false
	for _, arg := range os.Args {
		if arg == "--local" {
			localMode = true
			break
		}
	}

	runID := fmt.Sprintf("run-%d", time.Now().Unix())

	before := evaluate("repository_before", localMode)
	after := evaluate("repository_after", localMode)

	passedGate := after.Tests.Passed

	summary := "Verification failed"
	if passedGate {
		summary = "Verification of requirements passed"
	}

	end := time.Now()
	durationSeconds := end.Sub(start).Seconds()

	comparison := Comparison{
		PassedGate:         passedGate,
		ImprovementSummary: summary,
	}

	report := Report{
		RunID:           runID,
		StartedAt:       start.Format(time.RFC3339),
		FinishedAt:      end.Format(time.RFC3339),
		DurationSeconds: durationSeconds,
		Environment:     getEnvironmentInfo(),
		Before:          before,
		After:           after,
		Comparison:      comparison,
		Success:         passedGate,
	}

	// Calculate report path
	dateStr := start.Format("2006-01-02")
	timeStr := start.Format("15-04-05.000") // Replacing colons
	cwd, _ := os.Getwd()
	reportDir := filepath.Join(cwd, ReportsDir, dateStr, timeStr)
	
	if err := os.MkdirAll(reportDir, 0755); err != nil {
		fmt.Printf("Error creating report directory: %v\n", err)
		return
	}

	reportPath := filepath.Join(reportDir, "report.json")
	file, err := os.Create(reportPath)
	if err != nil {
		fmt.Printf("Error creating report file: %v\n", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		fmt.Printf("Error encoding report: %v\n", err)
		return
	}

	printReport(report, reportPath)

	if passedGate {
		os.Exit(0)
	} else {
		os.Exit(1)
	}
}
