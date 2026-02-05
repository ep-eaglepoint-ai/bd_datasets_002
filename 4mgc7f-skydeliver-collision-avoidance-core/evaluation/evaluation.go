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
)

type GoTestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test"`
	Elapsed float64   `json:"Elapsed"`
	Output  string    `json:"Output"`
}

type TestCaseResult struct {
	NodeID  string `json:"nodeid"`
	Name    string `json:"name"`
	Outcome string `json:"outcome"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type ImplementationResult struct {
	Success  bool             `json:"success"`
	ExitCode int              `json:"exit_code"`
	Tests    []TestCaseResult `json:"tests"`
	Summary  TestSummary      `json:"summary"`
	Stdout   string           `json:"stdout"`
	Stderr   string           `json:"stderr"`
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
	Before     ImplementationResult `json:"before"`
	After      ImplementationResult `json:"after"`
	Comparison Comparison           `json:"comparison"`
}

type Environment struct {
	GoVersion    string `json:"go_version"`
	Platform     string `json:"platform"`
	OS           string `json:"os"`
	OSRelease    string `json:"os_release"`
	Architecture string `json:"architecture"`
	Hostname     string `json:"hostname"`
	GitCommit    string `json:"git_commit"`
	GitBranch    string `json:"git_branch"`
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

func main() {
	start := time.Now()
	runID := fmt.Sprintf("%x", start.UnixNano())[:8]

	env := getEnvironment()

	// Run tests for Repository Before (using go.before.mod)
	beforeResult := runTests("skydeliver/tests", "go.before.mod")

	// Run tests for Repository After (using default go.mod)
	afterResult := runTests("skydeliver/tests", "")

	comparison := Comparison{
		BeforeTestsPassed: beforeResult.Success,
		AfterTestsPassed:  afterResult.Success,
		BeforeTotal:       beforeResult.Summary.Total,
		BeforePassed:      beforeResult.Summary.Passed,
		BeforeFailed:      beforeResult.Summary.Failed,
		AfterTotal:        afterResult.Summary.Total,
		AfterPassed:       afterResult.Summary.Passed,
		AfterFailed:       afterResult.Summary.Failed,
	}

	results := Results{
		Before:     beforeResult,
		After:      afterResult,
		Comparison: comparison,
	}

	finish := time.Now()
	duration := finish.Sub(start).Seconds()

	success := afterResult.Success

	var errStr *string
	if !success {
		s := "After implementation tests failed"
		errStr = &s
	}

	report := Report{
		RunID:           runID,
		StartedAt:       start.Format(time.RFC3339Nano),
		FinishedAt:      finish.Format(time.RFC3339Nano),
		DurationSeconds: duration,
		Success:         success,
		Error:           errStr,
		Environment:     env,
		Results:         results,
	}

	saveReport(report)

	if !success {
		os.Exit(1)
	}
}

func getEnvironment() Environment {
	hostname, _ := os.Hostname()

	gitCommit := "unknown"
	if out, err := exec.Command("git", "rev-parse", "HEAD").Output(); err == nil {
		gitCommit = strings.TrimSpace(string(out))[:8]
	}

	gitBranch := "unknown"
	if out, err := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD").Output(); err == nil {
		gitBranch = strings.TrimSpace(string(out))
	}

	return Environment{
		GoVersion:    runtime.Version(),
		Platform:     fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
		OS:           runtime.GOOS,
		OSRelease:    "unknown",
		Architecture: runtime.GOARCH,
		Hostname:     hostname,
		GitCommit:    gitCommit,
		GitBranch:    gitBranch,
	}
}

func runTests(pkg string, modfile string) ImplementationResult {
	wd, _ := os.Getwd()
	// Always run from the tests directory
	testsDir := filepath.Join(wd, "tests")

	args := []string{"test", "-json"}
	if modfile != "" {
		// Use absolute path for modfile
		absModfile := filepath.Join(wd, modfile)
		args = append(args, "-modfile="+absModfile)
	}
	args = append(args, ".") // Run tests in current directory (tests)

	cmd := exec.Command("go", args...)
	cmd.Dir = testsDir

	out, err := cmd.CombinedOutput()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	events := parseGoTestEvents(out)

	var tests []TestCaseResult
	passed := 0
	failed := 0
	skipped := 0

	for _, e := range events {
		if e.Test != "" {
			switch e.Action {
			case "pass":
				passed++
				tests = append(tests, TestCaseResult{
					NodeID:  fmt.Sprintf("%s::%s", e.Package, e.Test),
					Name:    e.Test,
					Outcome: "passed",
				})
			case "fail":
				failed++
				tests = append(tests, TestCaseResult{
					NodeID:  fmt.Sprintf("%s::%s", e.Package, e.Test),
					Name:    e.Test,
					Outcome: "failed",
				})
			case "skip":
				skipped++
				tests = append(tests, TestCaseResult{
					NodeID:  fmt.Sprintf("%s::%s", e.Package, e.Test),
					Name:    e.Test,
					Outcome: "skipped",
				})
			}
		}
	}

	summary := TestSummary{
		Total:   passed + failed + skipped,
		Passed:  passed,
		Failed:  failed,
		Errors:  0,
		Skipped: skipped,
	}

	return ImplementationResult{
		Success:  exitCode == 0 && failed == 0,
		ExitCode: exitCode,
		Tests:    tests,
		Summary:  summary,
		Stdout:   string(out),
		Stderr:   "",
	}
}

func parseGoTestEvents(output []byte) []GoTestEvent {
	var events []GoTestEvent
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var ev GoTestEvent
		if err := json.Unmarshal([]byte(line), &ev); err == nil {
			events = append(events, ev)
		}
	}
	return events
}

func saveReport(report Report) {
	dateStr := time.Now().Format("2006-01-02")
	timeStr := time.Now().Format("15-04-05")

	outDir := filepath.Join("evaluation", dateStr, timeStr)
	os.MkdirAll(outDir, 0755)

	f, _ := os.Create(filepath.Join(outDir, "report.json"))
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	enc.Encode(report)

	fmt.Printf("Report saved to %s\n", filepath.Join(outDir, "report.json"))
}
