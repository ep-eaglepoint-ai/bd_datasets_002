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
	SamplingWorking          bool `json:"sampling_working"`
	DeduplicationWorking     bool `json:"deduplication_working"`
	MaxEntriesWorking        bool `json:"max_entries_working"`
	RedactionWorking         bool `json:"redaction_working"`
	HashingWorking           bool `json:"hashing_working"`
	TruncationWorking        bool `json:"truncation_working"`
	TruncationMarkersWorking bool `json:"truncation_markers_working"`
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
		SamplingFixed          bool `json:"sampling_fixed"`
		DeduplicationFixed     bool `json:"deduplication_fixed"`
		MaxEntriesFixed        bool `json:"max_entries_fixed"`
		RedactionFixed         bool `json:"redaction_fixed"`
		HashingFixed           bool `json:"hashing_fixed"`
		TruncationFixed        bool `json:"truncation_fixed"`
		TruncationMarkersFixed bool `json:"truncation_markers_fixed"`
	} `json:"compliance_check"`
	Before     Repository `json:"before"`
	After      Repository `json:"after"`
	Comparison struct {
		SamplingFixed      bool `json:"sampling_fixed"`
		DeduplicationFixed bool `json:"deduplication_fixed"`
		MaxEntriesFixed    bool `json:"max_entries_fixed"`
		RedactionFixed     bool `json:"redaction_fixed"`
		HashingFixed       bool `json:"hashing_fixed"`
		TruncationFixed    bool `json:"truncation_fixed"`
		TestsPassing       int  `json:"tests_passing"`
		TestImprovement    int  `json:"test_improvement"`
		AllRequirementsMet bool `json:"all_requirements_met"`
	} `json:"comparison"`
	RequirementsChecklist struct {
		SamplingAboveRate     bool `json:"sampling_above_rate"`
		SamplingBelowRate     bool `json:"sampling_below_rate"`
		MaxEntriesEviction    bool `json:"max_entries_eviction"`
		DeduplicationEnabled  bool `json:"deduplication_enabled"`
		DeduplicationDisabled bool `json:"deduplication_disabled"`
		RedactionRules        bool `json:"redaction_rules"`
		HashingRules          bool `json:"hashing_rules"`
		TruncationWhenExceeds bool `json:"truncation_when_exceeds"`
		MetaTruncatedFlag     bool `json:"meta_truncated_flag"`
		TruncationMarkers     bool `json:"truncation_markers"`
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
	fmt.Println("🔬 Starting AuditLogger Evaluation...")

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
	verboseOutput, testErr := cmdVerbose.CombinedOutput()
	verboseOutputStr := string(verboseOutput)

	fmt.Println("Test output:")
	fmt.Println(verboseOutputStr)

	// Parse test results
	beforeResults := parseTestResultsForVersion(verboseOutputStr, "TestBeforeVersion")
	afterResults := parseTestResultsForVersion(verboseOutputStr, "TestAfterVersion")

	// Calculate summary
	beforePassed := countPassed(beforeResults)
	beforeFailed := countFailed(beforeResults)
	afterPassed := countPassed(afterResults)
	afterFailed := countFailed(afterResults)

	totalTests := len(beforeResults) + len(afterResults)
	totalPassed := beforePassed + afterPassed
	totalFailed := beforeFailed + afterFailed

	// Success criteria: After tests should pass, Before tests should have some failures
	success := afterPassed == 10 && beforeFailed >= 3

	// Create evaluation report
	report := EvaluationReport{}

	// Metadata
	report.EvaluationMetadata.EvaluationID = generateID()
	report.EvaluationMetadata.Timestamp = startTime.Format(time.RFC3339Nano)
	report.EvaluationMetadata.Evaluator = "automated_test_suite"
	report.EvaluationMetadata.Project = "auditlogger_test_coverage"
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
	exitCode := 0
	if testErr != nil {
		exitCode = 1
	}
	report.TestExecution.Success = success
	report.TestExecution.ExitCode = exitCode
	report.TestExecution.Summary.Total = totalTests
	report.TestExecution.Summary.Passed = totalPassed
	report.TestExecution.Summary.Failed = totalFailed
	report.TestExecution.Summary.Errors = 0
	report.TestExecution.Summary.Skipped = 0
	report.TestExecution.Stdout = fmt.Sprintf("Before Repository: %d/%d passed\nAfter Repository: %d/%d passed", beforePassed, len(beforeResults), afterPassed, len(afterResults))
	report.TestExecution.Stderr = ""

	// Combine all tests
	allTests := append(beforeResults, afterResults...)
	report.TestExecution.Tests = allTests

	// Meta testing
	report.MetaTesting.RequirementTraceability = map[string]string{
		"sampling_requirements":      "requirement_1_2",
		"storage_requirements":       "requirement_3_4_5",
		"transformation_requirements": "requirement_6_7",
		"truncation_requirements":    "requirement_8_9_10",
	}
	report.MetaTesting.AdversarialTesting = map[string]string{
		"sampling_edge_cases":    "requirement_1_2",
		"deduplication_behavior": "requirement_4_5",
		"rule_application":       "requirement_6_7",
		"truncation_behavior":    "requirement_8_9_10",
	}
	report.MetaTesting.EdgeCaseCoverage = map[string]string{
		"boundary_sample_rates": "requirement_1_2",
		"max_entries_overflow":  "requirement_3",
		"large_data_truncation": "requirement_8_9_10",
	}

	// Compliance check (based on after version results)
	report.ComplianceCheck.SamplingFixed = isTestPassed(afterResults, "Requirement1") && isTestPassed(afterResults, "Requirement2")
	report.ComplianceCheck.DeduplicationFixed = isTestPassed(afterResults, "Requirement4") && isTestPassed(afterResults, "Requirement5")
	report.ComplianceCheck.MaxEntriesFixed = isTestPassed(afterResults, "Requirement3")
	report.ComplianceCheck.RedactionFixed = isTestPassed(afterResults, "Requirement6")
	report.ComplianceCheck.HashingFixed = isTestPassed(afterResults, "Requirement7")
	report.ComplianceCheck.TruncationFixed = isTestPassed(afterResults, "Requirement8") && isTestPassed(afterResults, "Requirement9")
	report.ComplianceCheck.TruncationMarkersFixed = isTestPassed(afterResults, "Requirement10")

	// Before repository
	report.Before.Metrics = RepositoryMetrics{
		TotalFiles:               1,
		SamplingWorking:          isTestPassed(beforeResults, "Requirement1") && isTestPassed(beforeResults, "Requirement2"),
		DeduplicationWorking:     isTestPassed(beforeResults, "Requirement4"),
		MaxEntriesWorking:        isTestPassed(beforeResults, "Requirement3"),
		RedactionWorking:         isTestPassed(beforeResults, "Requirement6"),
		HashingWorking:           isTestPassed(beforeResults, "Requirement7"),
		TruncationWorking:        isTestPassed(beforeResults, "Requirement8"),
		TruncationMarkersWorking: isTestPassed(beforeResults, "Requirement10"),
	}
	report.Before.Tests = RepositoryTests{
		Passed:  beforePassed,
		Failed:  beforeFailed,
		Total:   len(beforeResults),
		Success: beforeFailed == 0,
		Tests:   beforeResults,
		Output:  extractTestOutput(verboseOutputStr, "TestBeforeVersion"),
	}

	// After repository
	report.After.Metrics = RepositoryMetrics{
		TotalFiles:               1,
		SamplingWorking:          isTestPassed(afterResults, "Requirement1") && isTestPassed(afterResults, "Requirement2"),
		DeduplicationWorking:     isTestPassed(afterResults, "Requirement4"),
		MaxEntriesWorking:        isTestPassed(afterResults, "Requirement3"),
		RedactionWorking:         isTestPassed(afterResults, "Requirement6"),
		HashingWorking:           isTestPassed(afterResults, "Requirement7"),
		TruncationWorking:        isTestPassed(afterResults, "Requirement8"),
		TruncationMarkersWorking: isTestPassed(afterResults, "Requirement10"),
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
	report.Comparison.SamplingFixed = !report.Before.Metrics.SamplingWorking && report.After.Metrics.SamplingWorking
	report.Comparison.DeduplicationFixed = !report.Before.Metrics.DeduplicationWorking && report.After.Metrics.DeduplicationWorking
	report.Comparison.MaxEntriesFixed = !report.Before.Metrics.MaxEntriesWorking && report.After.Metrics.MaxEntriesWorking
	report.Comparison.RedactionFixed = !report.Before.Metrics.RedactionWorking && report.After.Metrics.RedactionWorking
	report.Comparison.HashingFixed = !report.Before.Metrics.HashingWorking && report.After.Metrics.HashingWorking
	report.Comparison.TruncationFixed = !report.Before.Metrics.TruncationWorking && report.After.Metrics.TruncationWorking
	report.Comparison.TestsPassing = afterPassed
	report.Comparison.TestImprovement = afterPassed - beforePassed
	report.Comparison.AllRequirementsMet = afterPassed == 10

	// Requirements checklist
	report.RequirementsChecklist.SamplingAboveRate = isTestPassed(afterResults, "Requirement1")
	report.RequirementsChecklist.SamplingBelowRate = isTestPassed(afterResults, "Requirement2")
	report.RequirementsChecklist.MaxEntriesEviction = isTestPassed(afterResults, "Requirement3")
	report.RequirementsChecklist.DeduplicationEnabled = isTestPassed(afterResults, "Requirement4")
	report.RequirementsChecklist.DeduplicationDisabled = isTestPassed(afterResults, "Requirement5")
	report.RequirementsChecklist.RedactionRules = isTestPassed(afterResults, "Requirement6")
	report.RequirementsChecklist.HashingRules = isTestPassed(afterResults, "Requirement7")
	report.RequirementsChecklist.TruncationWhenExceeds = isTestPassed(afterResults, "Requirement8")
	report.RequirementsChecklist.MetaTruncatedFlag = isTestPassed(afterResults, "Requirement9")
	report.RequirementsChecklist.TruncationMarkers = isTestPassed(afterResults, "Requirement10")

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
	report.FinalVerdict.MeetsRequirements = afterPassed == 10

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
	fmt.Printf("   BEFORE VERSION: %d/%d passed (%d failed)\n", beforePassed, len(beforeResults), beforeFailed)
	fmt.Printf("   AFTER VERSION:  %d/%d passed (%d failed)\n", afterPassed, len(afterResults), afterFailed)
	fmt.Println()
	fmt.Println("📋 REQUIREMENTS CHECKLIST:")
	fmt.Println(strings.Repeat("-", 40))
	printRequirement("1. Sampling Above Rate", report.RequirementsChecklist.SamplingAboveRate)
	printRequirement("2. Sampling Below Rate", report.RequirementsChecklist.SamplingBelowRate)
	printRequirement("3. Max Entries Eviction", report.RequirementsChecklist.MaxEntriesEviction)
	printRequirement("4. Deduplication Enabled", report.RequirementsChecklist.DeduplicationEnabled)
	printRequirement("5. Deduplication Disabled", report.RequirementsChecklist.DeduplicationDisabled)
	printRequirement("6. Redaction Rules", report.RequirementsChecklist.RedactionRules)
	printRequirement("7. Hashing Rules", report.RequirementsChecklist.HashingRules)
	printRequirement("8. Truncation When Exceeds", report.RequirementsChecklist.TruncationWhenExceeds)
	printRequirement("9. Meta Truncated Flag", report.RequirementsChecklist.MetaTruncatedFlag)
	printRequirement("10. Truncation Markers", report.RequirementsChecklist.TruncationMarkers)
	fmt.Println()
	fmt.Println(strings.Repeat("=", 60))
	if success {
		fmt.Println("✅ EVALUATION SUCCESS: All requirements met!")
	} else {
		fmt.Println("❌ EVALUATION FAILED: Some requirements not met")
	}
	fmt.Printf("🔧 Requirements Met: %v (%d/10)\n", report.FinalVerdict.MeetsRequirements, afterPassed)
	fmt.Println(strings.Repeat("=", 60))

	if !success {
		os.Exit(1)
	}
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
		// Match PASS lines
		if strings.Contains(line, "--- PASS:") && strings.Contains(line, versionPrefix) {
			testName := extractTestName(line, "--- PASS:")
			duration := extractDuration(line)
			results = append(results, TestResult{
				Name:     testName,
				Status:   "PASS",
				Duration: duration,
			})
		}

		// Match FAIL lines
		if strings.Contains(line, "--- FAIL:") && strings.Contains(line, versionPrefix) {
			testName := extractTestName(line, "--- FAIL:")
			duration := extractDuration(line)

			// Collect failure messages (lines between RUN and FAIL)
			var failureMessages []string
			for j := i - 1; j >= 0 && j > i-20; j-- {
				if strings.Contains(lines[j], "=== RUN") {
					break
				}
				if strings.Contains(lines[j], "Error:") || strings.Contains(lines[j], "Expected") || strings.Contains(lines[j], "Received") {
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
		// Get the test name part before the duration
		namePart := strings.TrimSpace(parts[1])
		// Remove duration part (xxx.xxs)
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