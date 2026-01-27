package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Data Structures

type TestResult struct {
	NodeID   string  `json:"nodeid"`
	Name     string  `json:"name"`
	Outcome  string  `json:"outcome"`
	Duration float64 `json:"duration,omitempty"`
	Error    string  `json:"error,omitempty"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type RepositoryTestResult struct {
	Success         bool         `json:"success"`
	ExitCode        int          `json:"exit_code"`
	Tests           []TestResult `json:"tests"`
	Summary         TestSummary  `json:"summary"`
	Stdout          string       `json:"stdout"`
	Stderr          string       `json:"stderr"`
	DurationSeconds float64      `json:"duration_seconds"`
}

type Environment struct {
	GoVersion string `json:"go_version"`
	Platform  string `json:"platform"`
	OS        string `json:"os"`
	Arch      string `json:"architecture"`
	Hostname  string `json:"hostname"`
	GitCommit string `json:"git_commit"`
	GitBranch string `json:"git_branch"`
}

type Comparison struct {
	BeforeTestsPassed bool `json:"before_tests_passed"`
	BeforeTotal       int  `json:"before_total"`
	BeforePassed      int  `json:"before_passed"`
	BeforeFailed      int  `json:"before_failed"`
}

type Results struct {
	Before     RepositoryTestResult `json:"before"`
	Comparison Comparison           `json:"comparison"`
}

type EvaluationReport struct {
	RunID           string      `json:"run_id"`
	StartedAt       string      `json:"started_at"`
	FinishedAt      string      `json:"finished_at"`
	DurationSeconds float64     `json:"duration_seconds"`
	Success         bool        `json:"success"`
	Error           string      `json:"error"`
	Environment     Environment `json:"environment"`
	Results         Results     `json:"results"`
}

type GoTestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test,omitempty"`
	Elapsed float64   `json:"Elapsed,omitempty"`
	Output  string    `json:"Output,omitempty"`
}

func getGitInfo() (commit string, branch string) {
	commitBytes, err := exec.Command("git", "rev-parse", "HEAD").Output()
	if err == nil {
		commit = strings.TrimSpace(string(commitBytes))
	} else {
		commit = "unknown"
	}
	branchBytes, err := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD").Output()
	if err == nil {
		branch = strings.TrimSpace(string(branchBytes))
	} else {
		branch = "unknown"
	}
	return
}

func runTestsAndParse(repoName string) RepositoryTestResult {
	startTime := time.Now()
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("Evaluating Target: %s\n", repoName)
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	// Run tests using go test directly, relying on go.mod replacement
	cmd := exec.Command("go", "test", "-v", "-json", "./tests/...")
	cmd.Env = os.Environ()

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	var tests []TestResult
	summary := TestSummary{}

	scanner := bufio.NewScanner(&stdoutBuf)
	for scanner.Scan() {
		var event GoTestEvent
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}
		if event.Test != "" && (event.Action == "pass" || event.Action == "fail" || event.Action == "skip") {
			outcome := "passed"
			if event.Action == "fail" {
				outcome = "failed"
				summary.Failed++
			} else if event.Action == "skip" {
				outcome = "skipped"
				summary.Skipped++
			} else {
				summary.Passed++
			}
			summary.Total++

			tests = append(tests, TestResult{
				NodeID:   event.Package + "::" + event.Test,
				Name:     event.Test,
				Outcome:  outcome,
				Duration: event.Elapsed,
			})
		}
	}

	duration := time.Since(startTime).Seconds()
	fmt.Printf("Result: %d/%d passed (%.2fs)\n", summary.Passed, summary.Total, duration)

	return RepositoryTestResult{
		Success:         exitCode == 0 || summary.Failed == 0,
		ExitCode:        exitCode,
		Tests:           tests,
		Summary:         summary,
		Stdout:          stdoutBuf.String(),
		Stderr:          stderrBuf.String(),
		DurationSeconds: duration,
	}
}

func main() {
	outputFlag := flag.String("output", "", "Output path for report")
	flag.Parse()

	startAll := time.Now()
	runId := fmt.Sprintf("%x", startAll.UnixNano())
	hostname, _ := os.Hostname()

	resBefore := runTestsAndParse("repository_before")

	finishedAt := time.Now()
	commit, branch := getGitInfo()

	report := EvaluationReport{
		RunID:           runId,
		StartedAt:       startAll.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: finishedAt.Sub(startAll).Seconds(),
		Success:         resBefore.Success,
		Environment: Environment{
			GoVersion: runtime.Version(),
			Platform:  runtime.GOOS,
			OS:        runtime.GOOS,
			Arch:      runtime.GOARCH,
			Hostname:  hostname,
			GitCommit: commit,
			GitBranch: branch,
		},
		Results: Results{
			Before: resBefore,
			Comparison: Comparison{
				BeforeTestsPassed: resBefore.Success,
				BeforeTotal:       resBefore.Summary.Total,
				BeforePassed:      resBefore.Summary.Passed,
				BeforeFailed:      resBefore.Summary.Failed + resBefore.Summary.Errors,
			},
		},
	}

	var reportPath string
	if *outputFlag != "" {
		reportPath = *outputFlag
	} else {
		reportDir := filepath.Join("evaluation", startAll.Format("2006-01-02"), strings.ReplaceAll(startAll.Format("15-04-05"), ":", "-"))
		os.MkdirAll(reportDir, 0755)
		reportPath = filepath.Join(reportDir, "report.json")
	}

	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, data, 0644)

	fmt.Printf("\nGenerated report: %s\n", reportPath)
	if !resBefore.Success {
		os.Exit(1)
	}
}
