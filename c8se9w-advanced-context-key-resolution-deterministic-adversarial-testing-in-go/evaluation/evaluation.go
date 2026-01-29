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

// Metrics contains metrics data (empty for now)
type Metrics struct {
}

// TestRunTests contains the test run details
type TestRunTests struct {
	Passed    bool         `json:"passed"`
	ReturnCode int         `json:"return_code"`
	Output    string       `json:"output"`
	Stdout    string       `json:"stdout"`
	Stderr    string       `json:"stderr"`
	Tests     []TestResult `json:"tests"`
	Summary   TestSummary  `json:"summary"`
}

// TestRunResult contains results from a test run
type TestRunResult struct {
	Tests   TestRunTests `json:"tests"`
	Metrics Metrics      `json:"metrics"`
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

// Comparison contains comparison data between before and after (top-level, simplified)
type Comparison struct {
	PassedGate         bool   `json:"passed_gate"`
	ImprovementSummary string `json:"improvement_summary"`
}

// DetailedComparison contains detailed comparison data (for nested results)
type DetailedComparison struct {
	BeforeTestsPassed bool `json:"before_tests_passed"`
	AfterTestsPassed  bool `json:"after_tests_passed"`
	BeforeTotal       int  `json:"before_total"`
	BeforePassed      int  `json:"before_passed"`
	BeforeFailed      int  `json:"before_failed"`
	AfterTotal        int  `json:"after_total"`
	AfterPassed       int  `json:"after_passed"`
	AfterFailed       int  `json:"after_failed"`
}

// ResultsBeforeAfter contains the flat structure for nested results.before/after
type ResultsBeforeAfter struct {
	Passed    bool         `json:"passed"`
	ReturnCode int         `json:"return_code"`
	Output    string       `json:"output"`
	Stdout    string       `json:"stdout"`
	Stderr    string       `json:"stderr"`
	Tests     []TestResult `json:"tests"`
	Summary   TestSummary  `json:"summary"`
}

// Results contains both before and after test results (nested structure)
type Results struct {
	Before     ResultsBeforeAfter  `json:"before"`
	After      ResultsBeforeAfter  `json:"after"`
	Comparison DetailedComparison  `json:"comparison"`
}

// Report is the complete evaluation report
type Report struct {
	RunID           string          `json:"run_id"`
	StartedAt       string          `json:"started_at"`
	FinishedAt      string          `json:"finished_at"`
	DurationSeconds float64         `json:"duration_seconds"`
	Environment     EnvironmentInfo `json:"environment"`
	Before          TestRunResult   `json:"before"`
	After           TestRunResult   `json:"after"`
	Comparison      Comparison      `json:"comparison"`
	Success         bool            `json:"success"`
	Error           *string         `json:"error"`
	Results         *Results        `json:"results"`
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
	
	// Pattern to match: --- PASS: TestName (0.00s) or --- FAIL: TestName/subtest (0.00s)
	// Also handle cases with no duration: --- PASS: TestName
	// Captures full test name including subtests (e.g., "TestName/subtest")
	resultPattern := regexp.MustCompile(`^--- (PASS|FAIL|SKIP):\s+([^\s]+)(?:\s+\(([^)]+)\))?$`)

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
				// Use the actual test file name - try to extract from output or use default
				nodeID := fmt.Sprintf("tests/keys_meta_test.go::%s", testName)
				tests = append(tests, TestResult{
					NodeID:  nodeID,
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
		Tests: TestRunTests{
			Passed:    success,
			ReturnCode: exitCode,
			Output:    stdoutStr,
			Stdout:    stdoutStr,
			Stderr:    stderrStr,
			Tests:     tests,
			Summary: TestSummary{
				Total:   total,
				Passed:  passed,
				Failed:  failed,
				Errors:  errors,
				Skipped: skipped,
			},
		},
		Metrics: Metrics{},
	}
}

func runEvaluation(projectRoot string) (before, after TestRunResult, comparison Comparison) {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("MECHANICAL REFACTOR EVALUATION")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	beforePath := filepath.Join(projectRoot, "repository_before")
	afterPath := filepath.Join(projectRoot, "repository_after")
	
	// Run tests with BEFORE implementation
	beforeResults := runGoTests(projectRoot, beforePath, "before (repository_before)")
	
	// Run tests with AFTER implementation
	afterResults := runGoTests(projectRoot, afterPath, "after (repository_after)")
	
	// Build comparison (top-level, simplified)
	passedGate := afterResults.Tests.Passed
	improvementSummary := "After implementation passed harness tests."
	if !afterResults.Tests.Passed {
		improvementSummary = "After implementation failed harness tests."
	}
	
	comparison = Comparison{
		PassedGate:         passedGate,
		ImprovementSummary: improvementSummary,
	}
	
	// Print summary
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	fmt.Printf("\nBefore Implementation (repository_before):\n")
	if beforeResults.Tests.Passed {
		fmt.Printf("  Overall: ✅ PASSED\n")
	} else {
		fmt.Printf("  Overall: ❌ FAILED\n")
	}
	fmt.Printf("  Tests: %d/%d passed\n", beforeResults.Tests.Summary.Passed, beforeResults.Tests.Summary.Total)
	
	fmt.Printf("\nAfter Implementation (repository_after):\n")
	if afterResults.Tests.Passed {
		fmt.Printf("  Overall: ✅ PASSED\n")
	} else {
		fmt.Printf("  Overall: ❌ FAILED\n")
	}
	fmt.Printf("  Tests: %d/%d passed\n", afterResults.Tests.Summary.Passed, afterResults.Tests.Summary.Total)
	
	// Determine expected behavior
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("EXPECTED BEHAVIOR CHECK")
	fmt.Printf("%s\n", strings.Repeat("=", 60))
	
	if afterResults.Tests.Passed {
		fmt.Println("✅ After implementation: All tests passed (expected)")
	} else {
		fmt.Println("❌ After implementation: Some tests failed (unexpected - should pass all)")
	}
	
	return beforeResults, afterResults, comparison
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
	
	var beforeResults, afterResults TestRunResult
	var comparison Comparison
	var success bool
	var errorMsg *string
	
	defer func() {
		finishedAt := time.Now()
		duration := finishedAt.Sub(startedAt).Seconds()
		
		// Collect environment information
		environment := getEnvironmentInfo()
		
		// Format timestamps to match expected format (milliseconds with Z timezone)
		formatTimestamp := func(t time.Time) string {
			// Convert to UTC and format with milliseconds
			utc := t.UTC()
			return utc.Format("2006-01-02T15:04:05.000Z")
		}
		
		// Build nested Results structure
		nestedResults := &Results{
			Before: ResultsBeforeAfter{
				Passed:    beforeResults.Tests.Passed,
				ReturnCode: beforeResults.Tests.ReturnCode,
				Output:    beforeResults.Tests.Output,
				Stdout:    beforeResults.Tests.Stdout,
				Stderr:    beforeResults.Tests.Stderr,
				Tests:     beforeResults.Tests.Tests,
				Summary:   beforeResults.Tests.Summary,
			},
			After: ResultsBeforeAfter{
				Passed:    afterResults.Tests.Passed,
				ReturnCode: afterResults.Tests.ReturnCode,
				Output:    afterResults.Tests.Output,
				Stdout:    afterResults.Tests.Stdout,
				Stderr:    afterResults.Tests.Stderr,
				Tests:     afterResults.Tests.Tests,
				Summary:   afterResults.Tests.Summary,
			},
			Comparison: DetailedComparison{
				BeforeTestsPassed: beforeResults.Tests.Passed,
				AfterTestsPassed:  afterResults.Tests.Passed,
				BeforeTotal:       beforeResults.Tests.Summary.Total,
				BeforePassed:      beforeResults.Tests.Summary.Passed,
				BeforeFailed:      beforeResults.Tests.Summary.Failed,
				AfterTotal:        afterResults.Tests.Summary.Total,
				AfterPassed:       afterResults.Tests.Summary.Passed,
				AfterFailed:       afterResults.Tests.Summary.Failed,
			},
		}
		
		// Build report with both top-level and nested structures
		report := Report{
			RunID:           runID,
			StartedAt:       formatTimestamp(startedAt),
			FinishedAt:      formatTimestamp(finishedAt),
			DurationSeconds: duration,
			Environment:     environment,
			Before:          beforeResults,
			After:           afterResults,
			Comparison:      comparison,
			Success:         success,
			Error:           errorMsg,
			Results:         nestedResults,
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
	beforeResults, afterResults, comparison = runEvaluation(projectRoot)
	
	// Success if after implementation passes all tests
	success = afterResults.Tests.Passed
	if !success {
		msg := "After implementation tests failed"
		errorMsg = &msg
	}
}

