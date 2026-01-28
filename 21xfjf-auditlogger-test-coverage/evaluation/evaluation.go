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
	TotalFiles int `json:"total_files"`
}

type Repository struct {
	Metrics RepositoryMetrics `json:"metrics"`
	Tests   RepositoryTests   `json:"tests"`
}

type RequirementsChecklist struct {
	SamplingAboveRate       bool `json:"sampling_above_rate"`
	SamplingBelowRate       bool `json:"sampling_below_rate"`
	MaxEntriesEviction      bool `json:"max_entries_eviction"`
	DeduplicationEnabled    bool `json:"deduplication_enabled"`
	DeduplicationDisabled   bool `json:"deduplication_disabled"`
	RedactionRules          bool `json:"redaction_rules"`
	HashingRules            bool `json:"hashing_rules"`
	TruncationWhenExceeds   bool `json:"truncation_when_exceeds"`
	MetaTruncatedFlag       bool `json:"meta_truncated_flag"`
	TruncationMarkers       bool `json:"truncation_markers"`
	SinkFlushBehavior       bool `json:"sink_flush_behavior"`
	ComplexSnapshotTags     bool `json:"complex_snapshot_tags"`
	WildcardRulePaths       bool `json:"wildcard_rule_paths"`
	DeepRulePaths           bool `json:"deep_rule_paths"`
	ArrayRulePaths          bool `json:"array_rule_paths"`
	FlushWithNoSink         bool `json:"flush_with_no_sink"`
	FlushBatchSize          bool `json:"flush_batch_size"`
	LogsClearedAfterFlush   bool `json:"logs_cleared_after_flush"`
	InvalidRulePathRobust   bool `json:"invalid_rule_path_robust"`
	CircularReferenceHandle bool `json:"circular_reference_handle"`
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
	Before                Repository            `json:"before"`
	After                 Repository            `json:"after"`
	RequirementsChecklist RequirementsChecklist `json:"requirements_checklist"`
	FinalVerdict          struct {
		Success           bool   `json:"success"`
		TotalTests        int    `json:"total_tests"`
		PassedTests       int    `json:"passed_tests"`
		FailedTests       int    `json:"failed_tests"`
		SuccessRate       string `json:"success_rate"`
		MeetsRequirements bool   `json:"meets_requirements"`
	} `json:"final_verdict"`
}

const TOTAL_REQUIREMENTS = 20

func main() {
	fmt.Println("🔬 Starting AuditLogger Evaluation...")

	startTime := time.Now()

	dateStr := startTime.Format("2006-01-02")
	timeStr := startTime.Format("15-04-05")
	reportsDir := filepath.Join("reports", dateStr, timeStr)
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Printf("Error creating reports directory: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("📊 Running Go tests...")
	cmdVerbose := exec.Command("go", "test", "-v", "./...")
	cmdVerbose.Dir = "/app/tests"
	verboseOutput, testErr := cmdVerbose.CombinedOutput()
	verboseOutputStr := string(verboseOutput)

	fmt.Println("Test output:")
	fmt.Println(verboseOutputStr)

	beforeResults := parseTestResultsForVersion(verboseOutputStr, "BeforeVersion")
	afterResults := parseTestResultsForVersion(verboseOutputStr, "AfterVersion")

	beforePassed := countPassed(beforeResults)
	beforeFailed := countFailed(beforeResults)
	afterPassed := countPassed(afterResults)
	afterFailed := countFailed(afterResults)

	totalTests := len(beforeResults) + len(afterResults)
	totalPassed := beforePassed + afterPassed
	totalFailed := beforeFailed + afterFailed

	success := afterPassed == TOTAL_REQUIREMENTS

	report := EvaluationReport{}

	report.EvaluationMetadata.EvaluationID = generateID()
	report.EvaluationMetadata.Timestamp = startTime.Format(time.RFC3339Nano)
	report.EvaluationMetadata.Evaluator = "automated_test_suite"
	report.EvaluationMetadata.Project = "auditlogger_test_coverage"
	report.EvaluationMetadata.Version = "2.0.0"

	report.Environment.GoVersion = getGoVersion()
	report.Environment.Platform = runtime.GOOS
	report.Environment.OS = getOSName()
	report.Environment.OSRelease = getOSRelease()
	report.Environment.Architecture = runtime.GOARCH
	report.Environment.Hostname = getHostname()
	report.Environment.GitCommit = getGitCommit()
	report.Environment.GitBranch = getGitBranch()

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

	allTests := append(beforeResults, afterResults...)
	report.TestExecution.Tests = allTests

	report.Before.Metrics = RepositoryMetrics{TotalFiles: 1}
	report.Before.Tests = RepositoryTests{
		Passed:  beforePassed,
		Failed:  beforeFailed,
		Total:   len(beforeResults),
		Success: beforeFailed == 0,
		Tests:   beforeResults,
		Output:  extractTestOutput(verboseOutputStr, "BeforeVersion"),
	}

	report.After.Metrics = RepositoryMetrics{TotalFiles: 1}
	report.After.Tests = RepositoryTests{
		Passed:  afterPassed,
		Failed:  afterFailed,
		Total:   len(afterResults),
		Success: afterFailed == 0,
		Tests:   afterResults,
		Output:  extractTestOutput(verboseOutputStr, "AfterVersion"),
	}

	// Map test results to requirements
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
	report.RequirementsChecklist.SinkFlushBehavior = isTestPassed(afterResults, "Requirement11")
	report.RequirementsChecklist.ComplexSnapshotTags = isTestPassed(afterResults, "Requirement12")
	report.RequirementsChecklist.WildcardRulePaths = isTestPassed(afterResults, "Requirement13")
	report.RequirementsChecklist.DeepRulePaths = isTestPassed(afterResults, "Requirement14")
	report.RequirementsChecklist.ArrayRulePaths = isTestPassed(afterResults, "Requirement15")
	report.RequirementsChecklist.FlushWithNoSink = isTestPassed(afterResults, "Requirement16")
	report.RequirementsChecklist.FlushBatchSize = isTestPassed(afterResults, "Requirement17")
	report.RequirementsChecklist.LogsClearedAfterFlush = isTestPassed(afterResults, "Requirement18")
	report.RequirementsChecklist.InvalidRulePathRobust = isTestPassed(afterResults, "Requirement19")
	report.RequirementsChecklist.CircularReferenceHandle = isTestPassed(afterResults, "Requirement20")

	report.FinalVerdict.Success = success
	report.FinalVerdict.TotalTests = len(afterResults)
	report.FinalVerdict.PassedTests = afterPassed
	report.FinalVerdict.FailedTests = afterFailed
	if len(afterResults) > 0 {
		report.FinalVerdict.SuccessRate = fmt.Sprintf("%.1f", float64(afterPassed)/float64(len(afterResults))*100)
	} else {
		report.FinalVerdict.SuccessRate = "0.0"
	}
	report.FinalVerdict.MeetsRequirements = afterPassed == TOTAL_REQUIREMENTS

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
	fmt.Println("📋 REQUIREMENTS CHECKLIST (After Version):")
	fmt.Println(strings.Repeat("-", 40))
	printRequirement("1. Sampling Above Rate", report.RequirementsChecklist.SamplingAboveRate)
	printRequirement("2. Sampling Below Rate", report.RequirementsChecklist.SamplingBelowRate)
	printRequirement("3. Max Entries Eviction", report.RequirementsChecklist.MaxEntriesEviction)
	printRequirement("4. Deduplication Enabled", report.RequirementsChecklist.DeduplicationEnabled)
	printRequirement("5. Deduplication Disabled", report.RequirementsChecklist.DeduplicationDisabled)
	printRequirement("6. Redaction Rules (+ custom)", report.RequirementsChecklist.RedactionRules)
	printRequirement("7. Hashing Rules (deterministic)", report.RequirementsChecklist.HashingRules)
	printRequirement("8. Truncation When Exceeds", report.RequirementsChecklist.TruncationWhenExceeds)
	printRequirement("9. Meta Truncated Flag", report.RequirementsChecklist.MetaTruncatedFlag)
	printRequirement("10. Truncation Markers (all types)", report.RequirementsChecklist.TruncationMarkers)
	printRequirement("11. Sink Flush Behavior", report.RequirementsChecklist.SinkFlushBehavior)
	printRequirement("12. Complex Snapshot Tags", report.RequirementsChecklist.ComplexSnapshotTags)
	printRequirement("13. Wildcard Rule Paths", report.RequirementsChecklist.WildcardRulePaths)
	printRequirement("14. Deep Rule Paths", report.RequirementsChecklist.DeepRulePaths)
	printRequirement("15. Array Rule Paths", report.RequirementsChecklist.ArrayRulePaths)
	printRequirement("16. Flush With No Sink", report.RequirementsChecklist.FlushWithNoSink)
	printRequirement("17. Flush Batch Size", report.RequirementsChecklist.FlushBatchSize)
	printRequirement("18. Logs Cleared After Flush", report.RequirementsChecklist.LogsClearedAfterFlush)
	printRequirement("19. Invalid Rule Path Robust", report.RequirementsChecklist.InvalidRulePathRobust)
	printRequirement("20. Circular Reference Handle", report.RequirementsChecklist.CircularReferenceHandle)
	fmt.Println()
	fmt.Println(strings.Repeat("=", 60))
	if success {
		fmt.Println("✅ EVALUATION SUCCESS: All requirements met!")
	} else {
		fmt.Println("❌ EVALUATION FAILED: Some requirements not met")
	}
	fmt.Printf("🔧 Requirements Met: %v (%d/%d)\n", report.FinalVerdict.MeetsRequirements, afterPassed, TOTAL_REQUIREMENTS)
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
				if strings.Contains(lines[j], "Error:") || strings.Contains(lines[j], "Expected") || strings.Contains(lines[j], "got") {
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
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, versionPrefix) {
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
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 12)
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