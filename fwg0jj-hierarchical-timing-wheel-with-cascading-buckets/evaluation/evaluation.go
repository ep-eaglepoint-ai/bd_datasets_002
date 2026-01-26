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
)

type TestResult struct {
	Name            string   `json:"name"`
	Status          string   `json:"status"`
	Duration        string   `json:"duration"`
	FailureMessages []string `json:"failure_messages,omitempty"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type RepositoryTests struct {
	Passed  int          `json:"passed"`
	Failed  int          `json:"failed"`
	Total   int          `json:"total"`
	Success bool         `json:"success"`
	Tests   []TestResult `json:"tests"`
	Output  string       `json:"output"`
}

type RepositoryMetrics struct {
	TotalFiles               int  `json:"total_files"`
	MultipleWheelLevels      bool `json:"multiple_wheel_levels"`
	CascadingWorking         bool `json:"cascading_working"`
	VirtualTimeOnly          bool `json:"virtual_time_only"`
	OverflowHandling         bool `json:"overflow_handling"`
	CancellationWorking      bool `json:"cancellation_working"`
	RemainingTimeCalculation bool `json:"remaining_time_calculation"`
	RoundUpDelay             bool `json:"round_up_delay"`
}

type Repository struct {
	Metrics RepositoryMetrics `json:"metrics"`
	Tests   RepositoryTests   `json:"tests"`
}

type EvaluationReport struct {
	EvaluationMetadata struct {
		EvaluationID string `json:"evaluation_id"`
		Timestamp    string `json:"timestamp"`
		Evaluator    string `json:"evaluator"`
		Project      string `json:"project"`
		Version      string `json:"version"`
	} `json:"evaluation_metadata"`
	Environment struct {
		GoVersion    string `json:"go_version"`
		Platform     string `json:"platform"`
		OS           string `json:"os"`
		OSRelease    string `json:"os_release"`
		Architecture string `json:"architecture"`
		Hostname     string `json:"hostname"`
		GitCommit    string `json:"git_commit"`
		GitBranch    string `json:"git_branch"`
	} `json:"environment"`
	TestExecution struct {
		Success  bool         `json:"success"`
		ExitCode int          `json:"exit_code"`
		Tests    []TestResult `json:"tests"`
		Summary  TestSummary  `json:"summary"`
		Stdout   string       `json:"stdout"`
		Stderr   string       `json:"stderr"`
	} `json:"test_execution"`
	MetaTesting struct {
		RequirementTraceability map[string]string `json:"requirement_traceability"`
		AdversarialTesting      map[string]string `json:"adversarial_testing"`
		EdgeCaseCoverage        map[string]string `json:"edge_case_coverage"`
	} `json:"meta_testing"`
	ComplianceCheck struct {
		MultipleWheelLevels      bool `json:"multiple_wheel_levels"`
		CascadingFixed           bool `json:"cascading_fixed"`
		VirtualTimeOnly          bool `json:"virtual_time_only"`
		OverflowHandlingFixed    bool `json:"overflow_handling_fixed"`
		CancellationWorking      bool `json:"cancellation_working"`
		RemainingTimeCalculation bool `json:"remaining_time_calculation"`
		RoundUpDelayFixed        bool `json:"round_up_delay_fixed"`
	} `json:"compliance_check"`
	Before     Repository `json:"before"`
	After      Repository `json:"after"`
	Comparison struct {
		CascadingFixed        bool `json:"cascading_fixed"`
		OverflowHandlingFixed bool `json:"overflow_handling_fixed"`
		RoundUpDelayFixed     bool `json:"round_up_delay_fixed"`
		RemainingTimeFixed    bool `json:"remaining_time_fixed"`
		TestsPassing          int  `json:"tests_passing"`
		TestImprovement       int  `json:"test_improvement"`
		AllRequirementsMet    bool `json:"all_requirements_met"`
	} `json:"comparison"`
	RequirementsChecklist struct {
		MultipleWheelLevels      bool `json:"multiple_wheel_levels"`
		CascadingNotExecuting    bool `json:"cascading_not_executing"`
		VirtualTimeOnly          bool `json:"virtual_time_only"`
		OverflowHandling         bool `json:"overflow_handling"`
		CancellationO1           bool `json:"cancellation_o1"`
		RemainingTimeCalculation bool `json:"remaining_time_calculation"`
		RoundUpDelay             bool `json:"round_up_delay"`
	} `json:"requirements_checklist"`
	FinalVerdict struct {
		Success           bool   `json:"success"`
		TotalTests        int    `json:"total_tests"`
		PassedTests       int    `json:"passed_tests"`
		FailedTests       int    `json:"failed_tests"`
		SuccessRate       string `json:"success_rate"`
		MeetsRequirements bool   `json:"meets_requirements"`
	} `json:"final_verdict"`
}

func main() {
	fmt.Println("🔬 Starting Hierarchical Timing Wheel Evaluation...")

	startTime := time.Now()

	// Create reports directory with date/time structure
	dateStr := startTime.Format("2006-01-02")
	timeStr := startTime.Format("15-04-05")
	reportsDir := filepath.Join("reports", dateStr, timeStr)
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Printf("Error creating reports directory: %v\n", err)
		os.Exit(1)
	}

	// Run all tests
	fmt.Println("📊 Running Go tests...")
	cmdVerbose := exec.Command("go", "test", "-v", "./...")
	cmdVerbose.Dir = "/app/tests"
	verboseOutput, _ := cmdVerbose.CombinedOutput()
	verboseOutputStr := string(verboseOutput)

	fmt.Println("Test output:")
	fmt.Println(verboseOutputStr)

	// Parse test results - only after version
	afterResults := parseTestResultsForVersion(verboseOutputStr, "TestAfterVersion")

	// Calculate summary
	afterPassed := countPassed(afterResults)
	afterFailed := countFailed(afterResults)

	// Success criteria
	success := afterPassed >= 10 && afterFailed == 0

	// Create evaluation report
	report := EvaluationReport{}

	// Metadata
	report.EvaluationMetadata.EvaluationID = generateID()
	report.EvaluationMetadata.Timestamp = startTime.Format(time.RFC3339Nano)
	report.EvaluationMetadata.Evaluator = "automated_test_suite"
	report.EvaluationMetadata.Project = "hierarchical_timing_wheel"
	report.EvaluationMetadata.Version = "1.0.0"

	// Environment
	report.Environment.GoVersion = getGoVersion()
	report.Environment.Platform = runtime.GOOS
	report.Environment.OS = getOSName()
	report.Environment.OSRelease = getOSRelease()
	report.Environment.Architecture = runtime.GOARCH
	report.Environment.Hostname = getHostname()
	report.Environment.GitCommit = getGitCommit()
	report.Environment.GitBranch = getGitBranch()

	// Test execution
	report.TestExecution.Success = success
	report.TestExecution.ExitCode = 0
	report.TestExecution.Summary.Total = len(afterResults)
	report.TestExecution.Summary.Passed = afterPassed
	report.TestExecution.Summary.Failed = afterFailed
	report.TestExecution.Summary.Errors = 0
	report.TestExecution.Summary.Skipped = 0
	report.TestExecution.Stdout = fmt.Sprintf("Before Repository: 0/0 passed\nAfter Repository: %d/%d passed", afterPassed, len(afterResults))
	report.TestExecution.Stderr = ""
	report.TestExecution.Tests = afterResults

	// Meta testing
	report.MetaTesting.RequirementTraceability = map[string]string{
		"wheel_structure":   "requirement_1",
		"cascading_logic":   "requirement_2_6",
		"virtual_time":      "requirement_3",
		"overflow_handling": "requirement_4",
		"cancellation":      "requirement_5",
		"timing_precision":  "requirement_7",
	}
	report.MetaTesting.AdversarialTesting = map[string]string{
		"cascade_execution": "requirement_2",
		"overflow_edge":     "requirement_4",
		"early_firing":      "requirement_7",
	}
	report.MetaTesting.EdgeCaseCoverage = map[string]string{
		"zero_delay":    "edge_case",
		"large_delay":   "requirement_4",
		"tick_boundary": "requirement_7",
	}

	// Compliance check
	report.ComplianceCheck.MultipleWheelLevels = isTestPassed(afterResults, "Requirement1")
	report.ComplianceCheck.CascadingFixed = isTestPassed(afterResults, "Requirement2")
	report.ComplianceCheck.VirtualTimeOnly = isTestPassed(afterResults, "Requirement3")
	report.ComplianceCheck.OverflowHandlingFixed = isTestPassed(afterResults, "Requirement4")
	report.ComplianceCheck.CancellationWorking = isTestPassed(afterResults, "Requirement5")
	report.ComplianceCheck.RemainingTimeCalculation = isTestPassed(afterResults, "Requirement6")
	report.ComplianceCheck.RoundUpDelayFixed = isTestPassed(afterResults, "Requirement7")

	// Before repository - empty (no tests)
	report.Before.Metrics = RepositoryMetrics{
		TotalFiles:               0,
		MultipleWheelLevels:      false,
		CascadingWorking:         false,
		VirtualTimeOnly:          false,
		OverflowHandling:         false,
		CancellationWorking:      false,
		RemainingTimeCalculation: false,
		RoundUpDelay:             false,
	}
	report.Before.Tests = RepositoryTests{
		Passed:  0,
		Failed:  0,
		Total:   0,
		Success: false,
		Tests:   []TestResult{},
		Output:  "",
	}

	// After repository
	report.After.Metrics = RepositoryMetrics{
		TotalFiles:               1,
		MultipleWheelLevels:      isTestPassed(afterResults, "Requirement1"),
		CascadingWorking:         isTestPassed(afterResults, "Requirement2"),
		VirtualTimeOnly:          isTestPassed(afterResults, "Requirement3"),
		OverflowHandling:         isTestPassed(afterResults, "Requirement4"),
		CancellationWorking:      isTestPassed(afterResults, "Requirement5"),
		RemainingTimeCalculation: isTestPassed(afterResults, "Requirement6"),
		RoundUpDelay:             isTestPassed(afterResults, "Requirement7"),
	}
	report.After.Tests = RepositoryTests{
		Passed:  afterPassed,
		Failed:  afterFailed,
		Total:   len(afterResults),
		Success: afterFailed == 0,
		Tests:   afterResults,
		Output:  extractTestOutput(verboseOutputStr, "TestAfterVersion"),
	}

	// Comparison
	report.Comparison.CascadingFixed = report.After.Metrics.CascadingWorking
	report.Comparison.OverflowHandlingFixed = report.After.Metrics.OverflowHandling
	report.Comparison.RoundUpDelayFixed = report.After.Metrics.RoundUpDelay
	report.Comparison.RemainingTimeFixed = report.After.Metrics.RemainingTimeCalculation
	report.Comparison.TestsPassing = afterPassed
	report.Comparison.TestImprovement = afterPassed
	report.Comparison.AllRequirementsMet = afterPassed >= 10

	// Requirements checklist
	report.RequirementsChecklist.MultipleWheelLevels = isTestPassed(afterResults, "Requirement1")
	report.RequirementsChecklist.CascadingNotExecuting = isTestPassed(afterResults, "Requirement2")
	report.RequirementsChecklist.VirtualTimeOnly = isTestPassed(afterResults, "Requirement3")
	report.RequirementsChecklist.OverflowHandling = isTestPassed(afterResults, "Requirement4")
	report.RequirementsChecklist.CancellationO1 = isTestPassed(afterResults, "Requirement5")
	report.RequirementsChecklist.RemainingTimeCalculation = isTestPassed(afterResults, "Requirement6")
	report.RequirementsChecklist.RoundUpDelay = isTestPassed(afterResults, "Requirement7")

	// Final verdict
	report.FinalVerdict.Success = success
	report.FinalVerdict.TotalTests = len(afterResults)
	report.FinalVerdict.PassedTests = afterPassed
	report.FinalVerdict.FailedTests = afterFailed
	if len(afterResults) > 0 {
		report.FinalVerdict.SuccessRate = fmt.Sprintf("%.1f", float64(afterPassed)/float64(len(afterResults))*100)
	} else {
		report.FinalVerdict.SuccessRate = "0.0"
	}
	report.FinalVerdict.MeetsRequirements = afterPassed >= 10

	// Save report
	reportFile := filepath.Join(reportsDir, "report.json")
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling report: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(reportFile, reportJSON, 0644); err != nil {
		fmt.Printf("Error writing report: %v\n", err)
		os.Exit(1)
	}

	// Display results
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("🎯 EVALUATION RESULTS")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("📁 Report saved: %s\n", reportFile)
	fmt.Printf("🕐 Duration: %v\n", time.Since(startTime))
	fmt.Println()
	fmt.Println("📊 TEST SUMMARY:")
	fmt.Println(strings.Repeat("-", 40))
	fmt.Printf("   BEFORE VERSION: 0/0 passed (0 failed)\n")
	fmt.Printf("   AFTER VERSION:  %d/%d passed (%d failed)\n", afterPassed, len(afterResults), afterFailed)
	fmt.Println()
	fmt.Println("📋 REQUIREMENTS CHECKLIST:")
	fmt.Println(strings.Repeat("-", 40))
	printRequirement("1. Multiple Wheel Levels", report.RequirementsChecklist.MultipleWheelLevels)
	printRequirement("2. Cascading Not Executing", report.RequirementsChecklist.CascadingNotExecuting)
	printRequirement("3. Virtual Time Only", report.RequirementsChecklist.VirtualTimeOnly)
	printRequirement("4. Overflow Handling", report.RequirementsChecklist.OverflowHandling)
	printRequirement("5. O(1) Cancellation", report.RequirementsChecklist.CancellationO1)
	printRequirement("6. Remaining Time Calculation", report.RequirementsChecklist.RemainingTimeCalculation)
	printRequirement("7. Round Up Delay", report.RequirementsChecklist.RoundUpDelay)
	fmt.Println()
	fmt.Println(strings.Repeat("=", 60))
	if success {
		fmt.Println("✅ EVALUATION SUCCESS: All requirements met!")
	} else {
		fmt.Println("❌ EVALUATION FAILED: Some requirements not met")
	}
	fmt.Printf("🔧 Requirements Met: %v (%d/%d)\n", report.FinalVerdict.MeetsRequirements, afterPassed, len(afterResults))
	fmt.Println(strings.Repeat("=", 60))

	os.Exit(0)
}

func printRequirement(name string, passed bool) {
	status := "❌"
	if passed {
		status = "✅"
	}
	fmt.Printf("   %s %s\n", status, name)
}

func parseTestResultsForVersion(output string, versionPrefix string) []TestResult {
	var results []TestResult

	lines := strings.Split(output, "\n")

	for i, line := range lines {
		if strings.Contains(line, "--- PASS:") && strings.Contains(line, versionPrefix) {
			testName := extractTestName(line, "--- PASS:")
			duration := extractDuration(line)
			results = append(results, TestResult{
				Name:     testName,
				Status:   "PASS",
				Duration: duration,
			})
		}

		if strings.Contains(line, "--- FAIL:") && strings.Contains(line, versionPrefix) {
			testName := extractTestName(line, "--- FAIL:")
			duration := extractDuration(line)

			var failureMessages []string
			for j := i - 1; j >= 0 && j > i-20; j-- {
				if strings.Contains(lines[j], "=== RUN") {
					break
				}
				if strings.Contains(lines[j], "Error:") || strings.Contains(lines[j], "Expected") || strings.Contains(lines[j], "Received") || strings.Contains(lines[j], ".go:") {
					failureMessages = append([]string{strings.TrimSpace(lines[j])}, failureMessages...)
				}
			}

			results = append(results, TestResult{
				Name:            testName,
				Status:          "FAIL",
				Duration:        duration,
				FailureMessages: failureMessages,
			})
		}
	}

	return results
}

func extractTestName(line, prefix string) string {
	parts := strings.Split(line, prefix)
	if len(parts) > 1 {
		namePart := strings.TrimSpace(parts[1])
		if idx := strings.Index(namePart, " ("); idx > 0 {
			namePart = namePart[:idx]
		}
		return namePart
	}
	return ""
}

func extractDuration(line string) string {
	re := regexp.MustCompile(`\(([0-9.]+s)\)`)
	matches := re.FindStringSubmatch(line)
	if len(matches) > 1 {
		return matches[1]
	}
	return "0.00s"
}

func extractTestOutput(output, versionPrefix string) string {
	var sb strings.Builder
	inVersion := false

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "=== RUN") && strings.Contains(line, versionPrefix) {
			inVersion = true
		}
		if inVersion {
			sb.WriteString(line)
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

func countPassed(results []TestResult) int {
	count := 0
	for _, result := range results {
		if result.Status == "PASS" {
			count++
		}
	}
	return count
}

func countFailed(results []TestResult) int {
	count := 0
	for _, result := range results {
		if result.Status == "FAIL" {
			count++
		}
	}
	return count
}

func isTestPassed(results []TestResult, testNamePart string) bool {
	for _, result := range results {
		if strings.Contains(result.Name, testNamePart) {
			return result.Status == "PASS"
		}
	}
	return false
}

func generateID() string {
	return randomString(11)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	t := time.Now().UnixNano()
	for i := range b {
		b[i] = charset[(t+int64(i))%int64(len(charset))]
	}
	return string(b)
}

func getGoVersion() string {
	cmd := exec.Command("go", "version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func getOSName() string {
	return runtime.GOOS
}

func getOSRelease() string {
	cmd := exec.Command("uname", "-r")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}

func getGitCommit() string {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}

func getGitBranch() string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}