package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/hex"
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
	GoVersion    string `json:"go_version"`
	Platform     string `json:"platform"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Hostname     string `json:"hostname"`
	GitCommit    string `json:"git_commit"`
	GitBranch    string `json:"git_branch"`
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
	Before     *RepositoryTestResult `json:"before,omitempty"`
	After      *RepositoryTestResult `json:"after,omitempty"`
	Comparison *Comparison           `json:"comparison,omitempty"`
}

type EvaluationReport struct {
	RunID           string      `json:"run_id"`
	StartedAt       string      `json:"started_at"`
	FinishedAt      string      `json:"finished_at"`
	DurationSeconds float64     `json:"duration_seconds"`
	Success         bool        `json:"success"`
	Error           string      `json:"error,omitempty"`
	Environment     Environment `json:"environment"`
	Results         Results     `json:"results"`
}

type GoTestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test,omitempty"`
	Elapsed float64   `json:"Elapsed,omitempty"`
}

// Helpers

func generateRunID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func getGitInfo() (commit string, branch string) {
	commit = "unknown"
	branch = "unknown"

	c := exec.Command("git", "rev-parse", "HEAD")
	if out, err := c.Output(); err == nil {
		commit = strings.TrimSpace(string(out))
		if len(commit) > 8 {
			commit = commit[:8]
		}
	}

	b := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	if out, err := b.Output(); err == nil {
		branch = strings.TrimSpace(string(out))
	}

	return commit, branch
}

func runTests(repoPath string) *RepositoryTestResult {
	startTime := time.Now()
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("RUNNING TESTS: %s\n", strings.ToUpper(repoPath))
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	// Temporarily modify go.mod to use the specified repoPath
	originalGoMod, _ := os.ReadFile("go.mod")
	defer os.WriteFile("go.mod", originalGoMod, 0644)

	newGoMod := fmt.Sprintf("module pluginmgr\n\ngo 1.20\n\nreplace pluginmgr/repository => ./%s\n", repoPath)
	os.WriteFile("go.mod", []byte(newGoMod), 0644)

	cmd := exec.Command("go", "test", "-v", "-json", "./tests/...")
	cmd.Env = append(os.Environ(), "REPO_PATH="+repoPath)
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
			statusIcon := "✅"
			if event.Action == "fail" {
				outcome = "failed"
				statusIcon = "❌"
				summary.Failed++
			} else if event.Action == "skip" {
				outcome = "skipped"
				statusIcon = "⏭️"
				summary.Skipped++
			} else {
				summary.Passed++
			}
			summary.Total++

			nodeID := event.Package + "::" + event.Test
			fmt.Printf("  %s %s: %s\n", statusIcon, nodeID, outcome)

			tests = append(tests, TestResult{
				NodeID:   nodeID,
				Name:     event.Test,
				Outcome:  outcome,
				Duration: event.Elapsed,
			})
		}
	}

	duration := time.Since(startTime).Seconds()
	fmt.Printf("\nResults: %d passed, %d failed, %d errors, %d skipped (total: %d)\n",
		summary.Passed, summary.Failed, summary.Errors, summary.Skipped, summary.Total)

	return &RepositoryTestResult{
		Success:         summary.Failed == 0 && summary.Total > 0,
		ExitCode:        exitCode,
		Tests:           tests,
		Summary:         summary,
		Stdout:          stdoutBuf.String(),
		Stderr:          stderrBuf.String(),
		DurationSeconds: duration,
	}
}

func main() {
	targetFlag := flag.String("target", "all", "Target implementation: before, after, or all")
	outputFlag := flag.String("output", "", "Output JSON file path")
	flag.Parse()

	startAll := time.Now()
	runID := generateRunID()
	hostname, _ := os.Hostname()
	commit, branch := getGitInfo()

	fmt.Printf("Run ID: %s\n", runID)
	fmt.Printf("Started at: %s\n", startAll.Format(time.RFC3339))

	var resBefore, resAfter *RepositoryTestResult
	var results Results

	if *targetFlag == "before" || *targetFlag == "all" {
		resBefore = runTests("repository_before")
		results.Before = resBefore
	}
	if *targetFlag == "after" || *targetFlag == "all" {
		resAfter = runTests("repository_after")
		results.After = resAfter
	}

	finishedAt := time.Now()
	duration := finishedAt.Sub(startAll).Seconds()

	success := true
	if *targetFlag == "all" || *targetFlag == "after" {
		if resAfter != nil {
			success = resAfter.Success
		} else {
			success = false
		}
	} else if *targetFlag == "before" {
		if resBefore != nil {
			success = resBefore.Success
		} else {
			success = false
		}
	}

	var errorMsg string
	if !success {
		errorMsg = "Target implementation tests failed"
	}

	if *targetFlag == "all" && resBefore != nil && resAfter != nil {
		results.Comparison = &Comparison{
			BeforeTestsPassed: resBefore.Success,
			AfterTestsPassed:  resAfter.Success,
			BeforeTotal:       resBefore.Summary.Total,
			BeforePassed:      resBefore.Summary.Passed,
			BeforeFailed:      resBefore.Summary.Failed,
			AfterTotal:        resAfter.Summary.Total,
			AfterPassed:       resAfter.Summary.Passed,
			AfterFailed:       resAfter.Summary.Failed,
		}
	}

	report := EvaluationReport{
		RunID:           runID,
		StartedAt:       startAll.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: duration,
		Success:         success,
		Error:           errorMsg,
		Environment: Environment{
			GoVersion:    runtime.Version(),
			Platform:     runtime.GOOS,
			OS:           runtime.GOOS,
			Architecture: runtime.GOARCH,
			Hostname:     hostname,
			GitCommit:    commit,
			GitBranch:    branch,
		},
		Results: results,
	}

	var reportPath string
	if *outputFlag != "" {
		reportPath = *outputFlag
	} else {
		// Dated report
		reportDir := filepath.Join("evaluation", startAll.Format("2006-01-02"), startAll.Format("15-04-05"))
		os.MkdirAll(reportDir, 0755)
		reportPath = filepath.Join(reportDir, "report.json")
	}

	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, data, 0644)

	// CRITICAL FIX: Also write a copy to a fixed location for CI to always find the latest report easily.
	os.WriteFile("report.json", data, 0644)

	fmt.Printf("\n✅ Report saved to: %s (and also to root report.json)\n", reportPath)
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	if resBefore != nil {
		fmt.Printf("\nBefore Implementation (repository_before):\n")
		fmt.Printf("  Overall: %s\n", func() string {
			if resBefore.Success {
				return "✅ PASSED"
			}
			return "❌ FAILED"
		}())
		fmt.Printf("  Tests: %d/%d passed\n", resBefore.Summary.Passed, resBefore.Summary.Total)
	}

	if resAfter != nil {
		fmt.Printf("\nAfter Implementation (repository_after):\n")
		fmt.Printf("  Overall: %s\n", func() string {
			if resAfter.Success {
				return "✅ PASSED"
			}
			return "❌ FAILED"
		}())
		fmt.Printf("  Tests: %d/%d passed\n", resAfter.Summary.Passed, resAfter.Summary.Total)
	}

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EVALUATION COMPLETE")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	fmt.Printf("Run ID: %s\n", runID)
	fmt.Printf("Duration: %.2fs\n", duration)
	if success {
		fmt.Println("Success: ✅ YES")
	} else {
		fmt.Println("Success: ❌ NO")
	}

	// Always exit 0 for CI
	os.Exit(0)
}
