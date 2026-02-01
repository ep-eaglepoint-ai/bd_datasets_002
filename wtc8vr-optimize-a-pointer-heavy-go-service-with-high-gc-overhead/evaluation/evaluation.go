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
	"unicode"

	"github.com/google/uuid"
)

// TestResult represents a single test result
type TestResult struct {
	NodeID  string `json:"nodeid"`
	Name    string `json:"name"`
	Outcome string `json:"outcome"`
}

// TestSummary contains summary statistics
type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

// TestRunResult contains results from a test run
type TestRunResult struct {
	Success  bool         `json:"success"`
	ExitCode int          `json:"exit_code"`
	Tests    []TestResult `json:"tests"`
	Summary  TestSummary  `json:"summary"`
	Stdout   string       `json:"stdout"`
	Stderr   string       `json:"stderr"`
}

// EnvironmentInfo contains environment metadata
type EnvironmentInfo struct {
	GoVersion    string `json:"go_version"`
	Platform     string `json:"platform"`
	OS           string `json:"os"`
	OSRelease    string `json:"os_release"`
	Architecture string `json:"architecture"`
	Hostname     string `json:"hostname"`
	GitCommit    string `json:"git_commit"`
	GitBranch    string `json:"git_branch"`
}

// Comparison contains comparison data between before and after
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

// Results contains both before and after test results
type Results struct {
	Before     TestRunResult `json:"before"`
	After      TestRunResult `json:"after"`
	Comparison Comparison    `json:"comparison"`
}

// Report is the complete evaluation report
type Report struct {
	RunID          string          `json:"run_id"`
	StartedAt      string          `json:"started_at"`
	FinishedAt     string          `json:"finished_at"`
	DurationSeconds float64        `json:"duration_seconds"`
	Success        bool            `json:"success"`
	Error          *string         `json:"error"`
	Environment    EnvironmentInfo `json:"environment"`
	Results        *Results        `json:"results"`
}

func generateRunID() string {
	return uuid.New().String()[:8]
}

func getGitInfo() (commit, branch string) {
	commit = "unknown"
	branch = "unknown"

	// Get git commit
	cmd := exec.Command("git", "rev-parse", "HEAD")
	if output, err := cmd.Output(); err == nil {
		commit = strings.TrimSpace(string(output))
		if len(commit) > 8 {
			commit = commit[:8]
		}
	}

	// Get git branch
	cmd = exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	if output, err := cmd.Output(); err == nil {
		branch = strings.TrimSpace(string(output))
	}

	return commit, branch
}

func getEnvironmentInfo() EnvironmentInfo {
	gitCommit, gitBranch := getGitInfo()

	// Get Go version
	goVersion := "unknown"
	if cmd := exec.Command("go", "version"); cmd != nil {
		if output, err := cmd.Output(); err == nil {
			parts := strings.Fields(string(output))
			if len(parts) >= 3 {
				goVersion = parts[2]
			}
		}
	}

	hostname, _ := os.Hostname()

	return EnvironmentInfo{
		GoVersion:    goVersion,
		Platform:     runtime.GOOS + "-" + runtime.GOARCH,
		OS:           runtime.GOOS,
		OSRelease:    "unknown", // Go doesn't provide OS release easily
		Architecture: runtime.GOARCH,
		Hostname:     hostname,
		GitCommit:    gitCommit,
		GitBranch:    gitBranch,
	}
}

func parseGoTestOutput(output string) []TestResult {
	var tests []TestResult
	
	// Pattern to match: --- PASS: TestName (0.00s) or --- FAIL: TestName (0.00s)
	// Also handle cases with no duration: --- PASS: TestName
	resultPattern := regexp.MustCompile(`^--- (PASS|FAIL|SKIP):\s+(\w+)(?:\s+\(([^)]+)\))?$`)

	lines := strings.Split(output, "\n")
	testMap := make(map[string]string) // Track test name -> outcome
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Match test result (this is the definitive result)
		if matches := resultPattern.FindStringSubmatch(line); matches != nil {
			outcome := strings.ToLower(matches[1])
			testName := matches[2]
			
			// Map Go test outcomes to JSON format
			outcomeMap := map[string]string{
				"pass": "passed",
				"fail": "failed",
				"skip": "skipped",
			}
			
			jsonOutcome := outcomeMap[outcome]
			if jsonOutcome == "" {
				jsonOutcome = "error"
			}
			
			// Only add if we haven't seen this test yet (avoid duplicates)
			if _, exists := testMap[testName]; !exists {
				testMap[testName] = jsonOutcome
				tests = append(tests, TestResult{
					NodeID:  fmt.Sprintf("tests/heavyservice_test.go::%s", testName),
					Name:    testName,
					Outcome: jsonOutcome,
				})
			}
		}
	}
	
	return tests
}

func runGoTests(projectRoot, repositoryPath, label string) TestRunResult {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("RUNNING TESTS: %s\n", strings.ToUpper(label))
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	fmt.Printf("Repository: %s\n", repositoryPath)
	fmt.Printf("Tests directory: %s\n", filepath.Join(projectRoot, "tests"))

	testsDir := filepath.Join(projectRoot, "tests")
	
	// Build the command to run in the tests directory
	// Use absolute paths to avoid issues
	absTestsDir, _ := filepath.Abs(testsDir)
	absRepoPath, _ := filepath.Abs(repositoryPath)
	
	// Change to tests directory and run go test
	cmd := exec.Command("sh", "-c", 
		fmt.Sprintf("cd %s && go mod edit -replace gocode=%s && go mod tidy && go test -v .", 
			absTestsDir, absRepoPath))
	
	cmd.Dir = projectRoot
	
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			exitCode = -1
		}
	}
	
	output := stdout.String()
	errOutput := stderr.String()
	
	// Parse test results
	tests := parseGoTestOutput(output)
	
	// Count results
	passed := 0
	failed := 0
	errors := 0
	skipped := 0
	
	for _, test := range tests {
		switch test.Outcome {
		case "passed":
			passed++
		case "failed":
			failed++
		case "error":
			errors++
		case "skipped":
			skipped++
		}
	}
	
	total := len(tests)
	
	fmt.Printf("\nResults: %d passed, %d failed, %d errors, %d skipped (total: %d)\n",
		passed, failed, errors, skipped, total)
	
	// Print individual test results
	for _, test := range tests {
		statusIcon := map[string]string{
			"passed":  "✅",
			"failed":  "❌",
			"error":   "💥",
			"skipped": "⏭️",
		}[test.Outcome]
		if statusIcon == "" {
			statusIcon = "❓"
		}
		fmt.Printf("  %s %s: %s\n", statusIcon, test.NodeID, test.Outcome)
	}
	
	// Truncate stdout/stderr if too long
	stdoutStr := output
	if len(stdoutStr) > 3000 {
		stdoutStr = stdoutStr[len(stdoutStr)-3000:]
	}
	
	stderrStr := errOutput
	if len(stderrStr) > 1000 {
		stderrStr = stderrStr[len(stderrStr)-1000:]
	}
	
	success := exitCode == 0 && failed == 0 && errors == 0
	
	return TestRunResult{
		Success:  success,
		ExitCode: exitCode,
		Tests:    tests,
		Summary: TestSummary{
			Total:   total,
			Passed:  passed,
			Failed:  failed,
			Errors:  errors,
			Skipped: skipped,
		},
		Stdout: stdoutStr,
		Stderr: stderrStr,
	}
}

func runEvaluation(projectRoot string) Results {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("MECHANICAL REFACTOR EVALUATION")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	beforePath := filepath.Join(projectRoot, "repository_before")
	afterPath := filepath.Join(projectRoot, "repository_after")
	
	// Run tests with BEFORE implementation
	beforeResults := runGoTests(projectRoot, beforePath, "before (repository_before)")
	
	// Run tests with AFTER implementation
	afterResults := runGoTests(projectRoot, afterPath, "after (repository_after)")
	
	// Build comparison
	comparison := Comparison{
		BeforeTestsPassed: beforeResults.Success,
		AfterTestsPassed:  afterResults.Success,
		BeforeTotal:       beforeResults.Summary.Total,
		BeforePassed:      beforeResults.Summary.Passed,
		BeforeFailed:      beforeResults.Summary.Failed,
		AfterTotal:        afterResults.Summary.Total,
		AfterPassed:       afterResults.Summary.Passed,
		AfterFailed:       afterResults.Summary.Failed,
	}
	
	// Print summary
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	fmt.Printf("\nBefore Implementation (repository_before):\n")
	if beforeResults.Success {
		fmt.Printf("  Overall: ✅ PASSED\n")
	} else {
		fmt.Printf("  Overall: ❌ FAILED\n")
	}
	fmt.Printf("  Tests: %d/%d passed\n", comparison.BeforePassed, comparison.BeforeTotal)
	
	fmt.Printf("\nAfter Implementation (repository_after):\n")
	if afterResults.Success {
		fmt.Printf("  Overall: ✅ PASSED\n")
	} else {
		fmt.Printf("  Overall: ❌ FAILED\n")
	}
	fmt.Printf("  Tests: %d/%d passed\n", comparison.AfterPassed, comparison.AfterTotal)
	
	// Determine expected behavior
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EXPECTED BEHAVIOR CHECK")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	if afterResults.Success {
		fmt.Println("✅ After implementation: All tests passed (expected)")
	} else {
		fmt.Println("❌ After implementation: Some tests failed (unexpected - should pass all)")
	}
	
	return Results{
		Before:     beforeResults,
		After:      afterResults,
		Comparison: comparison,
	}
}

func generateOutputPath(projectRoot string) string {
	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15-04-05")
	
	outputDir := filepath.Join(projectRoot, "evaluation", dateStr, timeStr)
	os.MkdirAll(outputDir, 0755)
	
	return filepath.Join(outputDir, "report.json")
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	// Try to truncate at a word boundary
	truncated := s
	if len(truncated) > maxLen {
		truncated = truncated[len(truncated)-maxLen:]
		// Find first space or newline
		for i, r := range truncated {
			if unicode.IsSpace(r) {
				truncated = truncated[i+1:]
				break
			}
		}
	}
	return truncated
}

func main() {
	var projectRoot string
	var err error
	
	// Check for PROJECT_ROOT environment variable (set by Docker)
	if envRoot := os.Getenv("PROJECT_ROOT"); envRoot != "" {
		projectRoot = envRoot
	} else {
		projectRoot, err = os.Getwd()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting working directory: %v\n", err)
			os.Exit(1)
		}
		
		// Check if we're in the evaluation directory, if so go up one level
		if filepath.Base(projectRoot) == "evaluation" {
			projectRoot = filepath.Dir(projectRoot)
		}
	}
	
	var outputPath string
	if len(os.Args) > 2 && os.Args[1] == "--output" {
		outputPath = os.Args[2]
	} else {
		outputPath = generateOutputPath(projectRoot)
	}
	
	// Generate run ID and timestamps
	runID := generateRunID()
	startedAt := time.Now()
	
	fmt.Printf("Run ID: %s\n", runID)
	fmt.Printf("Started at: %s\n", startedAt.Format(time.RFC3339Nano))
	
	var results *Results
	var success bool
	var errorMsg *string
	
	defer func() {
		finishedAt := time.Now()
		duration := finishedAt.Sub(startedAt).Seconds()
		
		// Collect environment information
		environment := getEnvironmentInfo()
		
		// Build report
		report := Report{
			RunID:           runID,
			StartedAt:       startedAt.Format(time.RFC3339Nano),
			FinishedAt:      finishedAt.Format(time.RFC3339Nano),
			DurationSeconds: duration,
			Success:         success,
			Error:           errorMsg,
			Environment:     environment,
			Results:         results,
		}
		
		// Ensure output directory exists
		outputDir := filepath.Dir(outputPath)
		os.MkdirAll(outputDir, 0755)
		
		// Write JSON report
		jsonData, err := json.MarshalIndent(report, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
			os.Exit(1)
		}
		
		if err := os.WriteFile(outputPath, jsonData, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing report: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("\n✅ Report saved to: %s\n", outputPath)
		
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
		
		if !success {
			os.Exit(1)
		}
	}()
	
	// Run evaluation
	resultsVal := runEvaluation(projectRoot)
	results = &resultsVal
	
	// Success if after implementation passes all tests
	success = results.After.Success
	if !success {
		msg := "After implementation tests failed"
		errorMsg = &msg
	}
}

