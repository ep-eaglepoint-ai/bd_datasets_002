package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

// Phase 5A: Machine-Readable Report Schema Alignment

type TestCase struct {
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

type TestResults struct {
	Success  bool       `json:"success"`
	ExitCode int        `json:"exit_code"`
	Tests    []TestCase `json:"tests"`
	Summary  Summary    `json:"summary"`
	Stdout   string     `json:"stdout"`
	Stderr   string     `json:"stderr"`
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
	Before     *TestResults `json:"before"`
	After      *TestResults `json:"after"`
	Comparison Comparison   `json:"comparison"`
}

type RequirementStatus struct {
	ID          string   `json:"id"`
	Description string   `json:"description"`
	Status      string   `json:"status"` // PASS | FAIL
	Checks      []string `json:"checks"`
}

type Verdict struct {
	Status  string  `json:"status"` // SUCCESS | PARTIAL | FAILURE
	Success bool    `json:"success"`
	Error   *string `json:"error"`
}

type ReportSummary struct {
	TotalRequirements     int `json:"total_requirements"`
	SatisfiedRequirements int `json:"satisfied_requirements"`
	FailedRequirements    int `json:"failed_requirements"`
	TotalChecks           int `json:"total_checks"`
	PassedChecks          int `json:"passed_checks"`
	FailedChecks          int `json:"failed_checks"`
}

type Report struct {
	RunID           string              `json:"run_id"`
	StartedAt       string              `json:"started_at"`
	FinishedAt      string              `json:"finished_at"`
	DurationSeconds float64             `json:"duration_seconds"`
	Environment     Environment         `json:"environment"`
	Verdict         Verdict             `json:"verdict"`
	Requirements    []RequirementStatus `json:"requirements"`
	Results         Results             `json:"results"`
	Summary         ReportSummary       `json:"summary"`
	Success         bool                `json:"success"` // Legacy field
}

type goTestEvent struct {
	Time    string `json:"Time"`
	Action  string `json:"Action"`
	Package string `json:"Package"`
	Test    string `json:"Test"`
	Output  string `json:"Output"`
}

func getGitInfo() (string, string) {
	commit := "unknown"
	branch := "unknown"

	if out, err := exec.Command("git", "rev-parse", "--short", "HEAD").Output(); err == nil {
		commit = strings.TrimSpace(string(out))
	}
	if out, err := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD").Output(); err == nil {
		branch = strings.TrimSpace(string(out))
	}
	return commit, branch
}

func getOSRelease() string {
	if runtime.GOOS == "windows" {
		return "unknown"
	}
	out, err := exec.Command("uname", "-r").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

func getEnvironmentInfo() Environment {
	commit, branch := getGitInfo()
	osRelease := getOSRelease()
	platform := fmt.Sprintf("%s-%s-%s", runtime.GOOS, osRelease, runtime.GOARCH)

	hostname, _ := os.Hostname()

	return Environment{
		GoVersion:    runtime.Version(),
		Platform:     platform,
		OS:           runtime.GOOS,
		OSRelease:    osRelease,
		Architecture: runtime.GOARCH,
		Hostname:     hostname,
		GitCommit:    commit,
		GitBranch:    branch,
	}
}

func getRootDir() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "."
	}
	if filepath.Base(cwd) == "evaluation" {
		return filepath.Dir(cwd)
	}
	return cwd
}

func runTests(repoPath string, rootDir string) TestResults {
	testsDir := filepath.Join(rootDir, "tests")

	cmd := exec.Command("go", "test", "-json", "-v", "./...")
	cmd.Dir = testsDir
	cmd.Env = append(os.Environ(), fmt.Sprintf("REPO_PATH=%s", repoPath))

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return errorResult(fmt.Sprintf("stdout pipe error: %v", err))
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return errorResult(fmt.Sprintf("stderr pipe error: %v", err))
	}

	if err := cmd.Start(); err != nil {
		return errorResult(fmt.Sprintf("start error: %v", err))
	}

	var stdoutBuilder strings.Builder
	stderrBytes, _ := io.ReadAll(stderrPipe)

	statusMap := make(map[string]string)
	packageMap := make(map[string]string)
	order := make([]string, 0, 64)

	scanner := bufio.NewScanner(stdoutPipe)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 2*1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		stdoutBuilder.WriteString(line)
		stdoutBuilder.WriteString("\n")

		var ev goTestEvent
		if err := json.Unmarshal([]byte(line), &ev); err != nil {
			continue
		}
		if ev.Test == "" {
			continue
		}
		if ev.Action == "pass" || ev.Action == "fail" || ev.Action == "skip" {
			if _, ok := statusMap[ev.Test]; !ok {
				order = append(order, ev.Test)
			}
			statusMap[ev.Test] = ev.Action
			packageMap[ev.Test] = ev.Package
		}
	}

	_ = stdoutPipe.Close()
	err = cmd.Wait()
	stderr := string(stderrBytes)

	exitCode := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
		} else {
			exitCode = 2
		}
	}

	// Build test list deterministically
	sort.Strings(order)
	results := make([]TestCase, 0, len(order))
	summary := Summary{}

	for _, testName := range order {
		outcome := statusMap[testName]
		nodeID := fmt.Sprintf("%s::%s", packageMap[testName], testName)
		results = append(results, TestCase{
			NodeID:  nodeID,
			Name:    testName,
			Outcome: outcome,
		})

		switch outcome {
		case "pass":
			summary.Passed++
		case "fail":
			summary.Failed++
		case "skip":
			summary.Skipped++
		}
	}

	if exitCode != 0 && summary.Failed == 0 {
		summary.Errors = 1
	}

	summary.Total = summary.Passed + summary.Failed + summary.Errors + summary.Skipped

	return TestResults{
		Success:  exitCode == 0,
		ExitCode: exitCode,
		Tests:    results,
		Summary:  summary,
		Stdout:   stdoutBuilder.String(),
		Stderr:   stderr,
	}
}

func errorResult(message string) TestResults {
	return TestResults{
		Success:  false,
		ExitCode: 2,
		Tests:    []TestCase{},
		Summary:  Summary{Total: 0, Passed: 0, Failed: 0, Errors: 1, Skipped: 0},
		Stdout:   "",
		Stderr:   message,
	}
}

func generateRunID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func mapRequirements(afterResults TestResults) ([]RequirementStatus, ReportSummary) {
	reqs := []struct {
		id   string
		desc string
		test string
	}{
		{"REQ-02", "Must process 1,000,000 packets per second", "TestPerformanceAndRequirements/Throughput"},
		{"REQ-03", "Must use fewer than 10 total heap allocations", "TestPerformanceAndRequirements/Allocations"},
		{"REQ-08", "Fewer than 5 GC cycles", "TestPerformanceAndRequirements/GCCycles"},
		{"REQ-06", "Must not modify TelemetryPacket struct", "TestReq6_PacketStructUnchanged"},
		{"REQ-07", "Must not use unsafe pointers", "TestReq7_NoUnsafe"},
		{"REQ-11", "Must preserve thread safety and correctness", "TestReq11_ThreadSafety"},
	}

	testOutcomes := make(map[string]string)
	for _, t := range afterResults.Tests {
		testOutcomes[t.Name] = t.Outcome
	}

	result := make([]RequirementStatus, 0)
	satisfied := 0

	for _, r := range reqs {
		outcome := testOutcomes[r.test]
		status := "FAIL"
		if outcome == "pass" {
			status = "PASS"
			satisfied++
		}
		result = append(result, RequirementStatus{
			ID:          r.id,
			Description: r.desc,
			Status:      status,
			Checks:      []string{r.test},
		})
	}

	summary := ReportSummary{
		TotalRequirements:     len(reqs),
		SatisfiedRequirements: satisfied,
		FailedRequirements:    len(reqs) - satisfied,
		TotalChecks:           afterResults.Summary.Total,
		PassedChecks:          afterResults.Summary.Passed,
		FailedChecks:          afterResults.Summary.Failed + afterResults.Summary.Errors,
	}

	return result, summary
}

func main() {
	startTime := time.Now()
	runID := generateRunID()
	rootDir := getRootDir()

	beforePath := filepath.Join(rootDir, "repository_before")
	afterPath := filepath.Join(rootDir, "repository_after")

	fmt.Printf("Starting Evaluation Run: %s\n", runID)

	beforeResults := runTests(beforePath, rootDir)
	afterResults := runTests(afterPath, rootDir)

	finishTime := time.Now()
	duration := finishTime.Sub(startTime).Seconds()

	reqStatus, reportSummary := mapRequirements(afterResults)

	verdictStatus := "FAILURE"
	if afterResults.Success && reportSummary.FailedRequirements == 0 {
		verdictStatus = "SUCCESS"
	}

	var errMsg *string
	if verdictStatus == "FAILURE" {
		msg := "One or more requirements failed"
		if !afterResults.Success && afterResults.Summary.Errors > 0 {
			msg = "Evaluation error: " + afterResults.Stderr
		}
		errMsg = &msg
	}

	report := Report{
		RunID:           runID,
		StartedAt:       startTime.Format(time.RFC3339Nano),
		FinishedAt:      finishTime.Format(time.RFC3339Nano),
		DurationSeconds: duration,
		Environment:     getEnvironmentInfo(),
		Verdict: Verdict{
			Status:  verdictStatus,
			Success: verdictStatus == "SUCCESS",
			Error:   errMsg,
		},
		Requirements: reqStatus,
		Results: Results{
			Before: &beforeResults,
			After:  &afterResults,
			Comparison: Comparison{
				BeforeTestsPassed: beforeResults.Success,
				AfterTestsPassed:  afterResults.Success,
				BeforeTotal:       beforeResults.Summary.Total,
				BeforePassed:      beforeResults.Summary.Passed,
				BeforeFailed:      beforeResults.Summary.Failed,
				AfterTotal:        afterResults.Summary.Total,
				AfterPassed:       afterResults.Summary.Passed,
				AfterFailed:       afterResults.Summary.Failed,
			},
		},
		Summary: reportSummary,
		Success: verdictStatus == "SUCCESS",
	}

	outputDir := filepath.Join(rootDir, "evaluation", startTime.Format("2006-01-02"), startTime.Format("15-04-05"))
	_ = os.MkdirAll(outputDir, 0755)
	reportPath := filepath.Join(outputDir, "report.json")

	file, err := os.Create(reportPath)
	if err == nil {
		enc := json.NewEncoder(file)
		enc.SetIndent("", "  ")
		_ = enc.Encode(report)
		_ = file.Close()
	}

	beforeOverall := "FAILED"
	if beforeResults.Success {
		beforeOverall = "PASSED"
	}
	afterOverall := report.Verdict.Status

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Baseline Check (repository_before):\n  Overall: %s\n  Tests: %d/%d passed\n", beforeOverall, beforeResults.Summary.Passed, beforeResults.Summary.Total)
	fmt.Printf("Implementation Check (repository_after):\n  Overall: %s\n  Tests: %d/%d passed\n", afterOverall, afterResults.Summary.Passed, afterResults.Summary.Total)
	fmt.Printf("Requirements: %d/%d satisfied\n", reportSummary.SatisfiedRequirements, reportSummary.TotalRequirements)
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Full report saved to: %s\n", reportPath)

	exitCode := 0
	if beforeResults.ExitCode == 2 || afterResults.ExitCode == 2 {
		exitCode = 2
	} else if report.Verdict.Status != "SUCCESS" {
		exitCode = 1
	}

	os.Exit(exitCode)
}
