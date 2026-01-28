package main

import (
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
	NodeID  string `json:"nodeid"`
	Name    string `json:"name"`
	Outcome string `json:"outcome"`
}

type Summary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type ExecResult struct {
	Success  bool         `json:"success"`
	ExitCode int          `json:"exit_code"`
	Tests    []TestResult `json:"tests"`
	Summary  Summary      `json:"summary"`
	Stdout   string       `json:"stdout"`
	Stderr   string       `json:"stderr"`
}

type Environment struct {
	GoVersion     string `json:"go_version"`
	PythonVersion string `json:"python_version"` // Included for format compatibility
	Platform      string `json:"platform"`
	OS            string `json:"os"`
	OSRelease     string `json:"os_release"`
	Architecture  string `json:"architecture"`
	Hostname      string `json:"hostname"`
	GitCommit     string `json:"git_commit"`
	GitBranch     string `json:"git_branch"`
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

type Report struct {
	RunID           string      `json:"run_id"`
	StartedAt       string      `json:"started_at"`
	FinishedAt      string      `json:"finished_at"`
	DurationSeconds float64     `json:"duration_seconds"`
	Success         bool        `json:"success"`
	Error           *string     `json:"error"`
	Environment     Environment `json:"environment"`
	Results         Results     `json:"results"`
}

type Results struct {
	Before     ExecResult `json:"before"`
	After      ExecResult `json:"after"`
	Comparison Comparison `json:"comparison"`
}

func main() {
	target := flag.String("target", "both", "Target to evaluate: before, after, or both")
	flag.Parse()

	start := time.Now()
	runID := fmt.Sprintf("%x", start.Unix())[:8]

	fmt.Printf("Starting Detailed Evaluation Run: %s (Target: %s)\n", runID, *target)

	var afterRes, beforeRes ExecResult
	var results Results

	if *target == "after" || *target == "both" {
		afterRes = runTests("repository_after", true)
		results.After = afterRes
	}
	if *target == "before" || *target == "both" {
		beforeRes = runTests("repository_before", false)
		results.Before = beforeRes
	}

	if *target == "both" {
		results.Comparison = Comparison{
			BeforeTestsPassed: beforeRes.Success,
			AfterTestsPassed:  afterRes.Success,
			BeforeTotal:       beforeRes.Summary.Total,
			BeforePassed:      beforeRes.Summary.Passed,
			BeforeFailed:      beforeRes.Summary.Failed,
			AfterTotal:        afterRes.Summary.Total,
			AfterPassed:       afterRes.Summary.Passed,
			AfterFailed:       afterRes.Summary.Failed,
		}
	}

	finished := time.Now()

	hostname, _ := os.Hostname()

	report := Report{
		RunID:           runID,
		StartedAt:       start.Format("2006-01-02T15:04:05.000000"),
		FinishedAt:      finished.Format("2006-01-02T15:04:05.000000"),
		DurationSeconds: finished.Sub(start).Seconds(),
		Success:         afterRes.Success,
		Error:           nil,
		Environment: Environment{
			GoVersion:     runtime.Version(),
			PythonVersion: "N/A", // This is a Go project
			Platform:      fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
			OS:            runtime.GOOS,
			OSRelease:     "unknown", // Hard to get portably in Go without cgo or shell
			Architecture:  runtime.GOARCH,
			Hostname:      hostname,
			GitCommit:     "unknown",
			GitBranch:     "unknown",
		},
		Results: results,
	}

	if *target == "after" || *target == "both" {
		if !afterRes.Success {
			errStr := "After implementation tests failed"
			report.Error = &errStr
		}
	} else if *target == "before" {
		if !beforeRes.Success {
			errStr := "Before implementation tests failed (expected)"
			report.Error = &errStr
		}
	}

	// If target is before or after, don't generate report.json, just show status
	if *target != "both" {
		var res ExecResult
		if *target == "after" {
			res = afterRes
		} else {
			res = beforeRes
		}

		fmt.Printf("\n--- Test Results for %s ---\n", *target)
		fmt.Printf("Total: %d, Passed: %d, Failed: %d, Skipped: %d\n",
			res.Summary.Total, res.Summary.Passed, res.Summary.Failed, res.Summary.Skipped)

		if !res.Success {
			fmt.Printf("Status: FAILED\n")
			if res.Stdout != "" {
				// Only print first few lines of stdout if it failed
				lines := strings.Split(res.Stdout, "\n")
				maxLines := 20
				if len(lines) > maxLines {
					fmt.Printf("Stdout (truncated):\n%s\n...\n", strings.Join(lines[:maxLines], "\n"))
				} else {
					fmt.Printf("Stdout:\n%s\n", res.Stdout)
				}
			}
			if *target == "before" {
				os.Exit(0)
			}
			os.Exit(1)
		}
		fmt.Printf("Status: PASSED\n")
		return
	}

	// Save report
	dateStr := start.Format("2006-01-02")
	timeStr := start.Format("15-04-05")
	reportDir := filepath.Join("evaluation", dateStr, timeStr)
	os.MkdirAll(reportDir, 0755)

	reportPath := filepath.Join(reportDir, "report.json")
	file, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, file, 0644)

	fmt.Printf("\nEvaluation Complete. Report saved to %s\n", reportPath)
	fmt.Printf("Summary: Before(%d/%d), After(%d/%d)\n",
		beforeRes.Summary.Passed, beforeRes.Summary.Total,
		afterRes.Summary.Passed, afterRes.Summary.Total)

	if !afterRes.Success {
		os.Exit(1)
	}
}

func runTests(sourceDir string, isAfter bool) ExecResult {
	fmt.Printf("Evaluating %s...\n", sourceDir)

	tempDir, err := os.MkdirTemp("", "eval-*")
	if err != nil {
		return ExecResult{Stdout: err.Error()}
	}
	defer os.RemoveAll(tempDir)

	// Setup structure for tests to import 'apigateway/gateway'
	// Root tests folder imports apigateway/gateway.
	// repository_after has gateway/ folder.
	// repository_before does not.

	// 1. Copy source files to temp/gateway
	innerGateway := filepath.Join(tempDir, "gateway")
	os.MkdirAll(innerGateway, 0755)

	srcPath := sourceDir
	if isAfter {
		srcPath = filepath.Join(sourceDir, "gateway")
	}

	// Manual copy (simplified)
	files, _ := os.ReadDir(srcPath)
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".go") {
			continue
		}
		data, _ := os.ReadFile(filepath.Join(srcPath, f.Name()))
		content := string(data)
		// For before, we must change package main to package gateway
		if !isAfter {
			content = strings.Replace(content, "package main", "package gateway", 1)
		}
		os.WriteFile(filepath.Join(innerGateway, f.Name()), []byte(content), 0644)
	}

	// Copy go.mod from source if exists, or create one
	goModPath := filepath.Join(sourceDir, "go.mod")
	if _, err := os.Stat(goModPath); err == nil {
		data, _ := os.ReadFile(goModPath)
		os.WriteFile(filepath.Join(tempDir, "go.mod"), data, 0644)
	} else {
		os.WriteFile(filepath.Join(tempDir, "go.mod"), []byte("module apigateway\n\ngo 1.21\n"), 0644)
	}

	// 2. Copy tests to temp/tests
	os.MkdirAll(filepath.Join(tempDir, "tests"), 0755)
	testFiles, _ := os.ReadDir("tests")
	for _, f := range testFiles {
		if !strings.HasSuffix(f.Name(), ".go") {
			continue
		}
		data, _ := os.ReadFile(filepath.Join("tests", f.Name()))
		os.WriteFile(filepath.Join(tempDir, "tests", f.Name()), data, 0644)
	}

	// 3. Run tests
	cmd := exec.Command("go", "test", "-v", "./tests/...")
	cmd.Dir = tempDir
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			exitCode = 1
		}
	}

	res := ExecResult{
		Success:  err == nil,
		ExitCode: exitCode,
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
	}

	res.Tests = parseGoTestOutput(res.Stdout)
	res.Summary = Summary{
		Total:  len(res.Tests),
		Passed: 0,
		Failed: 0,
	}
	for _, t := range res.Tests {
		if t.Outcome == "passed" {
			res.Summary.Passed++
		} else if t.Outcome == "skipped" {
			res.Summary.Skipped++
		} else {
			res.Summary.Failed++
		}
	}

	if !res.Success && res.Summary.Failed == 0 {
		// If command failed but no tests were marked failed, count it as a general error
		res.Summary.Errors = 1
	}

	return res
}

func parseGoTestOutput(output string) []TestResult {
	var results []TestResult
	startedTests := make(map[string]bool)
	finishedTests := make(map[string]bool)

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "=== RUN") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				name := parts[2]
				startedTests[name] = true
			}
		} else if strings.HasPrefix(line, "--- PASS:") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				name := parts[2]
				results = append(results, TestResult{
					NodeID:  fmt.Sprintf("tests/%s", name),
					Name:    name,
					Outcome: "passed",
				})
				finishedTests[name] = true
			}
		} else if strings.HasPrefix(line, "--- FAIL:") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				name := parts[2]
				results = append(results, TestResult{
					NodeID:  fmt.Sprintf("tests/%s", name),
					Name:    name,
					Outcome: "failed",
				})
				finishedTests[name] = true
			}
		} else if strings.HasPrefix(line, "--- SKIP:") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				name := parts[2]
				results = append(results, TestResult{
					NodeID:  fmt.Sprintf("tests/%s", name),
					Name:    name,
					Outcome: "skipped",
				})
				finishedTests[name] = true
			}
		}
	}

	// Catch tests that started but never finished (e.g. panic)
	for name := range startedTests {
		if !finishedTests[name] {
			results = append(results, TestResult{
				NodeID:  fmt.Sprintf("tests/%s", name),
				Name:    name,
				Outcome: "failed",
			})
		}
	}

	return results
}
