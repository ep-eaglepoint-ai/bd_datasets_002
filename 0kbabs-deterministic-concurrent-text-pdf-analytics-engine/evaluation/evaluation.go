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
	Success         bool          `json:"success"`
	ExitCode        int           `json:"exit_code"`
	Tests           []TestResult  `json:"tests"`
	Summary         TestSummary   `json:"summary"`
	Stdout          string        `json:"stdout"`
	Stderr          string        `json:"stderr"`
	DurationSeconds float64       `json:"duration_seconds"`
}

type Environment struct {
	GoVersion   string `json:"go_version"`
	Platform    string `json:"platform"`
	OS          string `json:"os"`
	Arch        string `json:"architecture"`
	Hostname    string `json:"hostname"`
	GitCommit   string `json:"git_commit"`
	GitBranch   string `json:"git_branch"`
}

type Comparison struct {
	BeforeTestsPassed     bool    `json:"before_tests_passed"`
	AfterTestsPassed      bool    `json:"after_tests_passed"`
	BeforeTotal           int     `json:"before_total"`
	BeforePassed          int     `json:"before_passed"`
	BeforeFailed          int     `json:"before_failed"`
	AfterTotal            int     `json:"after_total"`
	AfterPassed           int     `json:"after_passed"`
	AfterFailed           int     `json:"after_failed"`
	ImprovementPercentage float64 `json:"improvement_percentage"`
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
	Error           string      `json:"error"` // using string pointer or empty string if null
	Environment     Environment `json:"environment"`
	Results         Results     `json:"results"`
}

// Go Test JSON Event Structure
type GoTestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test,omitempty"`
	Elapsed float64   `json:"Elapsed,omitempty"`
	Output  string    `json:"Output,omitempty"`
}

// Helpers

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

func getGoVersion() string {
	return runtime.Version()
}

func generateRunId() string {
	return fmt.Sprintf("%x", time.Now().UnixNano())
}

// runTestsAndParse executes go test -json ./tests/... and parses result
func runTestsAndParse(repoName string) RepositoryTestResult {
	startTime := time.Now()
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("Running tests for %s...\n", repoName)
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	// Prepare command
	cmd := exec.Command("go", "test", "-count=1", "-json", "./tests/...")
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

	// Parse JSON Output
	var tests []TestResult
	summary := TestSummary{}
	
	scanner := bufio.NewScanner(&stdoutBuf)
	for scanner.Scan() {
		var event GoTestEvent
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}

		if event.Test != "" {
			// We only care about finished tests (pass/fail/skip)
			if event.Action == "pass" || event.Action == "fail" || event.Action == "skip" {
				outcome := "passed"
				if event.Action == "fail" {
					outcome = "failed"
				} else if event.Action == "skip" {
					outcome = "skipped"
				}

				tr := TestResult{
					NodeID:   fmt.Sprintf("%s::%s", event.Package, event.Test),
					Name:     event.Test,
					Outcome:  outcome,
					Duration: event.Elapsed,
				}
				tests = append(tests, tr)

				switch outcome {
				case "passed":
					summary.Passed++
					fmt.Printf("  ✅ PASSED (%.2fs) %s\n", event.Elapsed, event.Test)
				case "failed":
					summary.Failed++
					fmt.Printf("  ❌ FAILED (%.2fs) %s\n", event.Elapsed, event.Test)
				case "skipped":
					summary.Skipped++
					fmt.Printf("  ⚠️ SKIPPED (%.2fs) %s\n", event.Elapsed, event.Test)
				}
			}
		}
	}
	summary.Total = summary.Passed + summary.Failed + summary.Skipped + summary.Errors

	// If the command failed but we parsed 0 tests, it might be a build error
	rawStderr := stderrBuf.String()
	if exitCode != 0 && summary.Total == 0 {
		summary.Errors = 1
		summary.Total++ // count the build failure as a "test unit" or just error
		// Log the raw error
		fmt.Printf("  ❌ BUILD/EXECUTION FAILED\n%s\n", rawStderr)
	}

	duration := time.Since(startTime).Seconds()

	fmt.Printf("\n%s Summary:\n", repoName)
	fmt.Printf("  Total: %d\n", summary.Total)
	fmt.Printf("  Passed: %d\n", summary.Passed)
	fmt.Printf("  Failed: %d\n", summary.Failed)
	fmt.Printf("  Duration: %.2fs\n\n", duration)

	return RepositoryTestResult{
		Success:         exitCode == 0,
		ExitCode:        exitCode,
		Tests:           tests,
		Summary:         summary,
		Stdout:          stdoutBuf.String(),
		Stderr:          rawStderr,
		DurationSeconds: duration,
	}
}

func main() {
	outputFlag := flag.String("output", "", "Output path for report")
	flag.Parse()

	startAll := time.Now()
	runId := generateRunId()
	hostname, _ := os.Hostname()

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("EVALUATION RUN ID: %s\n", runId)
	fmt.Printf("Started at: %s\n", startAll.Format(time.RFC3339))
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	// Run Tests for Before
	os.Setenv("TEST_TARGET", "before")
	resBefore := runTestsAndParse("repository_before")

	// Run Tests for After
	os.Setenv("TEST_TARGET", "after")
	resAfter := runTestsAndParse("repository_after")

	finishedAt := time.Now()
	commit, branch := getGitInfo()

	// Calculate Improvement
	var improvement float64 = 0
	if resAfter.Summary.Total > 0 {
		afterRate := float64(resAfter.Summary.Passed) / float64(resAfter.Summary.Total) * 100
		improvement = afterRate
	}

	// Generate Report
	report := EvaluationReport{
		RunID:           runId,
		StartedAt:       startAll.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: finishedAt.Sub(startAll).Seconds(),
		Success:         resAfter.Success,
		Error:           "",
		Environment: Environment{
			GoVersion:   getGoVersion(),
			Platform:    runtime.GOOS, // approximations
			OS:          runtime.GOOS,
			Arch:        runtime.GOARCH,
			Hostname:    hostname,
			GitCommit:   commit,
			GitBranch:   branch,
		},
		Results: Results{
			Before: resBefore,
			After:  resAfter,
			Comparison: Comparison{
				BeforeTestsPassed:     resBefore.Success,
				AfterTestsPassed:      resAfter.Success,
				BeforeTotal:           resBefore.Summary.Total,
				BeforePassed:          resBefore.Summary.Passed,
				BeforeFailed:          resBefore.Summary.Failed + resBefore.Summary.Errors,
				AfterTotal:            resAfter.Summary.Total,
				AfterPassed:           resAfter.Summary.Passed,
				AfterFailed:           resAfter.Summary.Failed + resAfter.Summary.Errors,
				ImprovementPercentage: improvement,
			},
		},
	}

	// Output
	var reportPath string
	if *outputFlag != "" {
		reportPath = *outputFlag
		dir := filepath.Dir(reportPath)
		os.MkdirAll(dir, 0755)
	} else {
		// e.g. evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json
		t := startAll
		datePart := t.Format("2006-01-02")
		timePart := strings.ReplaceAll(t.Format("15-04-05"), ":", "-")
		reportDir := filepath.Join("evaluation", "reports", datePart, timePart)
		os.MkdirAll(reportDir, 0755)
		reportPath = filepath.Join(reportDir, "report.json")
	}

	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, data, 0644)

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EVALUATION COMPLETE")
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	fmt.Printf("Report Summary:\n")
	fmt.Printf("  Run ID: %s\n", runId)
	fmt.Printf("  Duration: %.2fs\n", report.DurationSeconds)
	successIcon := "❌ NO"
	if report.Success {
		successIcon = "✅ YES"
	}
	fmt.Printf("  Overall Success: %s\n\n", successIcon)

	fmt.Println("Results:")
	fmt.Printf("  repository_before: %d/%d passed\n", resBefore.Summary.Passed, resBefore.Summary.Total)
	fmt.Printf("  repository_after:  %d/%d passed\n", resAfter.Summary.Passed, resAfter.Summary.Total)
	fmt.Printf("  Improvement: %.1f%%\n\n", improvement)

	fmt.Printf("Report generated at: %s\n\n", reportPath)

	if !resAfter.Success {
		os.Exit(1)
	}
}
