package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type TestResult struct {
	Name   string  `json:"name"`
	Status string  `json:"status"`
	Time   float64 `json:"time"`
	Error  string  `json:"error,omitempty"`
}

type RepoResults struct {
	TotalTests      int          `json:"total_tests"`
	Passed          int          `json:"passed"`
	Failed          int          `json:"failed"`
	SuccessRate     float64      `json:"success_rate"`
	TestResults     []TestResult `json:"test_results"`
	ExitCode        int          `json:"exit_code"`
	Stdout          string       `json:"stdout"`
	Stderr          string       `json:"stderr"`
	ExecutionMethod string       `json:"execution_method"`
}

type Report struct {
	EvaluationStatus     string                 `json:"evaluation_status"`
	Timestamp            string                 `json:"timestamp"`
	ExecutionEnvironment string                 `json:"execution_environment"`
	Repositories         map[string]RepoResults `json:"repositories"`
	Summary              ReportSummary          `json:"summary"`
	RequirementsMet      RequirementsMet        `json:"requirements_met"`
}

type ReportSummary struct {
	TotalTestsBefore int  `json:"total_tests_before"`
	PassedBefore     int  `json:"passed_before"`
	FailedBefore     int  `json:"failed_before"`
	TotalTestsAfter  int  `json:"total_tests_after"`
	PassedAfter      int  `json:"passed_after"`
	FailedAfter      int  `json:"failed_after"`
	OverallSuccess   bool `json:"overall_success"`
}

type RequirementsMet struct {
	AllTestsExecuted bool `json:"all_tests_executed"`
	ZeroFailures     bool `json:"zero_failures"`
	ReportGenerated  bool `json:"report_generated"`
}

type GoTestEvent struct {
	Time   time.Time `json:"Time"`
	Action string    `json:"Action"`
	Package string   `json:"Package"`
	Test   string    `json:"Test"`
	Elapsed float64  `json:"Elapsed"`
	Output string    `json:"Output"`
}

func runTests(repoPath string) RepoResults {
	results := RepoResults{
		TestResults:     []TestResult{},
		ExecutionMethod: "direct",
	}

	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		results.ExecutionMethod = "error"
		results.Stdout = fmt.Sprintf("Error getting absolute path: %v", err)
		return results
	}

	cmd := exec.Command("go", "test", "-v", "-json", "./...")
	cmd.Dir = absPath

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		results.ExecutionMethod = "error"
		results.Stdout = fmt.Sprintf("Error creating stdout pipe: %v", err)
		return results
	}

	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		results.ExecutionMethod = "error"
		results.Stdout = fmt.Sprintf("Error starting command: %v", err)
		return results
	}

	var stdout strings.Builder
	scanner := bufio.NewScanner(stdoutPipe)
	for scanner.Scan() {
		line := scanner.Text()
		stdout.WriteString(line + "\n")
		
		var event GoTestEvent
		if err := json.Unmarshal([]byte(line), &event); err == nil {
			if event.Test != "" {
				if event.Action == "pass" {
					results.Passed++
					results.TestResults = append(results.TestResults, TestResult{
						Name:   event.Test,
						Status: "PASS",
						Time:   event.Elapsed,
					})
				} else if event.Action == "fail" {
					results.Failed++
					results.TestResults = append(results.TestResults, TestResult{
						Name:   event.Test,
						Status: "FAIL",
						Time:   event.Elapsed,
						Error:  event.Output,
					})
				}
			}
		}
	}

	err = cmd.Wait()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			results.ExitCode = exitError.ExitCode()
		} else {
			results.ExitCode = -1
		}
	}

	results.TotalTests = results.Passed + results.Failed
	if results.TotalTests > 0 {
		results.SuccessRate = (float64(results.Passed) / float64(results.TotalTests)) * 100
	}
	results.Stdout = stdout.String()
	results.Stderr = stderr.String()

	return results
}

func main() {
	inDocker := false
	if _, err := os.Stat("/app/evaluation"); err == nil {
		inDocker = true
		fmt.Println("Running evaluation in Docker container")
	} else {
		fmt.Println("Running evaluation on host system")
	}

	var repoBefore, repoAfter string
	if inDocker {
		repoBefore = "/app/repository_before"
		repoAfter = "/app/repository_after"
	} else {
		repoBefore = "repository_before"
		repoAfter = "repository_after"
	}

	beforeResults := runTests(repoBefore)
	afterResults := runTests(repoAfter)

	report := Report{
		EvaluationStatus:     "completed",
		Timestamp:            time.Now().Format(time.RFC3339),
		ExecutionEnvironment: "host",
		Repositories: map[string]RepoResults{
			"repository_before": beforeResults,
			"repository_after":  afterResults,
		},
		Summary: ReportSummary{
			TotalTestsBefore: beforeResults.TotalTests,
			PassedBefore:     beforeResults.Passed,
			FailedBefore:     beforeResults.Failed,
			TotalTestsAfter:  afterResults.TotalTests,
			PassedAfter:      afterResults.Passed,
			FailedAfter:      afterResults.Failed,
			OverallSuccess:   beforeResults.Failed == 0 && afterResults.Failed == 0,
		},
		RequirementsMet: RequirementsMet{
			AllTestsExecuted: beforeResults.TotalTests > 0 && afterResults.TotalTests > 0,
			ZeroFailures:     beforeResults.Failed == 0 && afterResults.Failed == 0,
			ReportGenerated:  true,
		},
	}
	if inDocker {
		report.ExecutionEnvironment = "docker"
	}

	// Create directories and write reports
	reportPaths := []string{
		"evaluation/report.json",
	}
	if inDocker {
		reportPaths = append(reportPaths, "/app/evaluation/report.json", "/tmp/evaluation/report.json")
	}

	for _, path := range reportPaths {
		dir := filepath.Dir(path)
		os.MkdirAll(dir, 0755)
		
		file, _ := json.MarshalIndent(report, "", "  ")
		err := os.WriteFile(path, file, 0644)
		if err != nil {
			fmt.Printf("Error writing report to %s: %v\n", path, err)
		} else {
			abs, _ := filepath.Abs(path)
			fmt.Printf("Report written to: %s\n", abs)
		}
	}

	// Write status.txt
	statusContent := fmt.Sprintf("Evaluation completed: %v\n", report.Summary.OverallSuccess)
	statusContent += fmt.Sprintf("Tests passed: %d\n", report.Summary.PassedBefore+report.Summary.PassedAfter)
	statusContent += fmt.Sprintf("Tests failed: %d\n", report.Summary.FailedBefore+report.Summary.FailedAfter)
	statusContent += fmt.Sprintf("Environment: %s\n", report.ExecutionEnvironment)

	os.WriteFile("evaluation/status.txt", []byte(statusContent), 0644)
	fmt.Println("Status file written to: evaluation/status.txt")

	fmt.Printf("Evaluation completed:\n")
	fmt.Printf("Repository Before: %d/%d tests passed\n", beforeResults.Passed, beforeResults.TotalTests)
	fmt.Printf("Repository After: %d/%d tests passed\n", afterResults.Passed, afterResults.TotalTests)
	fmt.Printf("Overall Status: %s\n", func() string { if report.Summary.OverallSuccess { return "PASS" } ; return "FAIL" }())
}
