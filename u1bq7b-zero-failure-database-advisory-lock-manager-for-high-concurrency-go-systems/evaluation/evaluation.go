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

func getGoVersion() string {
	return runtime.Version()
}

func generateRunId() string {
	return fmt.Sprintf("%x", time.Now().UnixNano())
}

func runTestsAndParse(repoName string) RepositoryTestResult {
	startTime := time.Now()
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("Running tests for %s...\n", repoName)
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

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

	var tests []TestResult
	summary := TestSummary{}

	scanner := bufio.NewScanner(&stdoutBuf)
	for scanner.Scan() {
		var event GoTestEvent
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}

		if event.Test != "" {
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

	rawStderr := stderrBuf.String()
	if exitCode != 0 && summary.Total == 0 {
		summary.Errors = 1
		summary.Total++
		fmt.Printf("  ❌ BUILD/EXECUTION FAILED\n%s\n", rawStderr)
	}

	duration := time.Since(startTime).Seconds()

	fmt.Printf("\n%s Summary:\n", repoName)
	fmt.Printf("  Total: %d\n", summary.Total)
	fmt.Printf("  Passed: %d\n", summary.Passed)
	fmt.Printf("  Failed: %d\n", summary.Failed)
	fmt.Printf("  Skipped: %d\n", summary.Skipped)
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
	targetFlag := flag.String("target", "", "Target to run: 'before', 'after', or 'all' (default)")
	flag.Parse()

	startAll := time.Now()
	runId := generateRunId()
	hostname, _ := os.Hostname()

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("DATABASE ADVISORY LOCK MANAGER EVALUATION\n")
	fmt.Printf("Run ID: %s\n", runId)
	fmt.Printf("Started at: %s\n", startAll.Format(time.RFC3339))
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))

	wd, err := os.Getwd()
	if err != nil {
		fmt.Printf("Error getting working directory: %v\n", err)
		os.Exit(1)
	}
	goModPath := filepath.Join(wd, "go.mod")

	updateGoMod := func(repoPath string) error {
		goModContent := fmt.Sprintf(`module zerofailure

go 1.21

require (
	dblock-demo v0.0.0
	github.com/DATA-DOG/go-sqlmock v1.5.2
	github.com/lib/pq v1.10.9
)

replace dblock-demo => %s
`, repoPath)
		return os.WriteFile(goModPath, []byte(goModContent), 0644)
	}

	var resBefore, resAfter RepositoryTestResult

	// Helper to patch repository_before in temp dir
	prepareBeforeRepo := func() (string, error) {
		tempDir := os.TempDir()
		targetDir := filepath.Join(tempDir, "repository_before_patched")
		
		// Clean and recreate
		os.RemoveAll(targetDir)
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return "", err
		}

		// Copy files
		// On Windows/Linux this might be different, simpler to assume cp works or use simple copy
		// Using exec cp for simplicity as we are in Docker or Git Bash
		if err := exec.Command("cp", "-r", "./repository_before/dblock-demo", targetDir).Run(); err != nil {
			return "", fmt.Errorf("failed to copy repo: %v", err)
		}
		
		// Patch go.mod
		goModFile := filepath.Join(targetDir, "dblock-demo", "go.mod")
		content, err := os.ReadFile(goModFile)
		if err == nil {
			newContent := strings.Replace(string(content), "go 1.25.5", "go 1.21", 1)
			os.WriteFile(goModFile, []byte(newContent), 0644)
		}
		
		return filepath.Join(targetDir, "dblock-demo"), nil
	}

	if *targetFlag == "" || *targetFlag == "all" || *targetFlag == "before" {
		os.Setenv("TEST_TARGET", "before")
		path, err := prepareBeforeRepo()
		if err != nil {
			fmt.Printf("Error preparing before repo: %v\n", err)
			os.Exit(1)
		}
		if err := updateGoMod(path); err != nil {
			fmt.Printf("Error updating go.mod for before: %v\n", err)
		}
		resBefore = runTestsAndParse("repository_before")
	}

	if *targetFlag == "" || *targetFlag == "all" || *targetFlag == "after" {
		os.Setenv("TEST_TARGET", "after")
		if err := updateGoMod("./repository_after"); err != nil {
			fmt.Printf("Error updating go.mod for after: %v\n", err)
		}
		resAfter = runTestsAndParse("repository_after")
	}

	finishedAt := time.Now()
	commit, branch := getGitInfo()

	var improvement float64 = 0
	if resAfter.Summary.Total > 0 && resBefore.Summary.Total > 0 {
		beforeRate := float64(resBefore.Summary.Passed) / float64(resBefore.Summary.Total) * 100
		afterRate := float64(resAfter.Summary.Passed) / float64(resAfter.Summary.Total) * 100
		improvement = afterRate - beforeRate
	} else if resAfter.Summary.Total > 0 {
		improvement = float64(resAfter.Summary.Passed) / float64(resAfter.Summary.Total) * 100
	}

	report := EvaluationReport{
		RunID:           runId,
		StartedAt:       startAll.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: finishedAt.Sub(startAll).Seconds(),
		Success:         resAfter.Success,
		Error:           "",
		Environment: Environment{
			GoVersion: getGoVersion(),
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

	var reportPath string
	if *outputFlag != "" {
		reportPath = *outputFlag
		dir := filepath.Dir(reportPath)
		os.MkdirAll(dir, 0755)
	} else {
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
