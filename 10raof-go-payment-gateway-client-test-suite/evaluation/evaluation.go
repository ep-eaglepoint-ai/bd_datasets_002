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
	AfterTestsPassed  bool `json:"after_tests_passed"`
	BeforeTotal       int  `json:"before_total"`
	BeforePassed      int  `json:"before_passed"`
	BeforeFailed      int  `json:"before_failed"`
	AfterTotal        int  `json:"after_total"`
	AfterPassed       int  `json:"after_passed"`
	AfterFailed       int  `json:"after_failed"`
}

type Results struct {
	Before     RepositoryTestResult `json:"before"`
	After      RepositoryTestResult `json:"after"`
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

func runMetaTests(repoName string) RepositoryTestResult {
	startTime := time.Now()
	// Header for console output
	fmt.Printf("\n%s\n", strings.Repeat("-", 60))
	fmt.Printf("Evaluating Target: %s\n", repoName)
	if repoName == "repository_before" {
		fmt.Println("      Expected: FAIL (incomplete/missing tests)")
	} else {
		fmt.Println("      Expected: PASS (valid tests)")
	}
	fmt.Printf("%s\n", strings.Repeat("-", 60))

	// Run tests using go test, targeting the meta_test.go in ./tests/
	// but pointing TARGET_REPO to the correct folder
	cmd := exec.Command("go", "test", "-v", "-json", "./tests/...")
	cmd.Env = append(os.Environ(), fmt.Sprintf("TARGET_REPO=%s", repoName))

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

	scanner := bufio.NewScanner(bytes.NewReader(stdoutBuf.Bytes()))
	for scanner.Scan() {
		var event GoTestEvent
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}
		// Capture basic test events (pass/fail/skip) for individual tests
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
	passRate := 0
	if summary.Total > 0 {
		passRate = (summary.Passed * 100) / summary.Total
	}

	statusIcon := "✅"
	if exitCode != 0 || summary.Failed > 0 {
		statusIcon = "❌"
	}

	fmt.Printf("Result: %s %d/%d passed (%d%%) (%.2fs)\n", statusIcon, summary.Passed, summary.Total, passRate, duration)

	return RepositoryTestResult{
		// A run is successful if exit code is 0 AND no failed tests
		Success:         exitCode == 0 && summary.Failed == 0,
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

	fmt.Printf("%s\n", strings.Repeat("=", 60))
	fmt.Printf("EVALUATION: Go Payment Gateway Meta-Testing\n")
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	// 1. Run against repository_before
	resBefore := runMetaTests("repository_before")

	// 2. Run against repository_after
	fmt.Println()
	resAfter := runMetaTests("repository_after")

	finishedAt := time.Now()
	commit, branch := getGitInfo()

	// Logic: Success if Before fails AND After passes
	overallSuccess := (!resBefore.Success) && resAfter.Success

	var errorMsg string
	if resBefore.Success {
		errorMsg = "repository_before passed but should have failed"
	} else if !resAfter.Success {
		errorMsg = "repository_after failed"
	}

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	if overallSuccess {
		fmt.Println("VERDICT: SUCCESS ✅")
	} else {
		fmt.Println("VERDICT: FAILURE ❌")
	}
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	report := EvaluationReport{
		RunID:           runId,
		StartedAt:       startAll.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: finishedAt.Sub(startAll).Seconds(),
		Success:         overallSuccess,
		Error:           errorMsg,
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
			After:  resAfter,
			Comparison: Comparison{
				BeforeTestsPassed: resBefore.Success,
				AfterTestsPassed:  resAfter.Success,
				BeforeTotal:       resBefore.Summary.Total,
				BeforePassed:      resBefore.Summary.Passed,
				BeforeFailed:      resBefore.Summary.Failed + resBefore.Summary.Errors,
				AfterTotal:        resAfter.Summary.Total,
				AfterPassed:       resAfter.Summary.Passed,
				AfterFailed:       resAfter.Summary.Failed + resAfter.Summary.Errors,
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
	if !overallSuccess {
		os.Exit(1)
	}
}
