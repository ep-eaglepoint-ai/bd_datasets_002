package main

import (
	"bufio"
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
	Name     string `json:"name"`
	Status   string `json:"status"`
	Duration string `json:"duration"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type RepositoryMetrics struct {
	TotalFiles                int  `json:"total_files"`
	Coverage100Percent        bool `json:"coverage_100_percent"`
	SequenceContinuityWorking bool `json:"sequence_continuity_working"`
	GCDFluxWorking            bool `json:"gcd_flux_working"`
	HealthFlapsWorking        bool `json:"health_flaps_working"`
	ConcurrencyWorking        bool `json:"concurrency_working"`
	AdversarialZeroWorking    bool `json:"adversarial_zero_working"`
	BoundarySliceWorking      bool `json:"boundary_slice_working"`
	SubTestsStructure         bool `json:"subtests_structure"`
	SequenceAuditorWorking    bool `json:"sequence_auditor_working"`
}

type RepositoryTests struct {
	Passed  int          `json:"passed"`
	Failed  int          `json:"failed"`
	Total   int          `json:"total"`
	Success bool         `json:"success"`
	Tests   []TestResult `json:"tests"`
	Output  string       `json:"output"`
}

type RequirementTraceability struct {
	Coverage           string `json:"coverage"`
	SequenceContinuity string `json:"sequence_continuity"`
	GCDFlux            string `json:"gcd_flux"`
	HealthFlaps        string `json:"health_flaps"`
	Concurrency        string `json:"concurrency"`
	AdversarialZero    string `json:"adversarial_zero"`
	BoundarySlice      string `json:"boundary_slice"`
	SubTests           string `json:"subtests"`
	SequenceAuditor    string `json:"sequence_auditor"`
}

type AdversarialTesting struct {
	ZeroWeights    string `json:"zero_weights"`
	SliceReduction string `json:"slice_reduction"`
	HealthToggle   string `json:"health_toggle"`
}

type EdgeCaseCoverage struct {
	EmptyNodes   string `json:"empty_nodes"`
	SingleNode   string `json:"single_node"`
	AllUnhealthy string `json:"all_unhealthy"`
}

type MetaTesting struct {
	RequirementTraceability RequirementTraceability `json:"requirement_traceability"`
	AdversarialTesting      AdversarialTesting      `json:"adversarial_testing"`
	EdgeCaseCoverage        EdgeCaseCoverage        `json:"edge_case_coverage"`
}

type ComplianceCheck struct {
	Coverage100Percent       bool `json:"coverage_100_percent"`
	SequenceContinuityFixed  bool `json:"sequence_continuity_fixed"`
	GCDFluxFixed             bool `json:"gcd_flux_fixed"`
	HealthFlapsFixed         bool `json:"health_flaps_fixed"`
	ConcurrencyFixed         bool `json:"concurrency_fixed"`
	AdversarialZeroFixed     bool `json:"adversarial_zero_fixed"`
	BoundarySliceFixed       bool `json:"boundary_slice_fixed"`
	SubTestsStructureFixed   bool `json:"subtests_structure_fixed"`
	SequenceAuditorFixed     bool `json:"sequence_auditor_fixed"`
}

type RequirementsChecklist struct {
	Req1Coverage           bool `json:"req1_coverage"`
	Req2SequenceContinuity bool `json:"req2_sequence_continuity"`
	Req3GCDFlux            bool `json:"req3_gcd_flux"`
	Req4HealthFlaps        bool `json:"req4_health_flaps"`
	Req5Concurrency        bool `json:"req5_concurrency"`
	Req6AdversarialZero    bool `json:"req6_adversarial_zero"`
	Req7BoundarySlice      bool `json:"req7_boundary_slice"`
	Req8SubTests           bool `json:"req8_subtests"`
	Req9SequenceAuditor    bool `json:"req9_sequence_auditor"`
}

type Comparison struct {
	CoverageFixed           bool `json:"coverage_fixed"`
	SequenceContinuityFixed bool `json:"sequence_continuity_fixed"`
	GCDFluxFixed            bool `json:"gcd_flux_fixed"`
	HealthFlapsFixed        bool `json:"health_flaps_fixed"`
	ConcurrencyFixed        bool `json:"concurrency_fixed"`
	AdversarialZeroFixed    bool `json:"adversarial_zero_fixed"`
	BoundarySliceFixed      bool `json:"boundary_slice_fixed"`
	TestsPassing            int  `json:"tests_passing"`
	TestImprovement         int  `json:"test_improvement"`
	AllRequirementsMet      bool `json:"all_requirements_met"`
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
	MetaTesting       MetaTesting     `json:"meta_testing"`
	ComplianceCheck   ComplianceCheck `json:"compliance_check"`
	Before            struct {
		Metrics RepositoryMetrics `json:"metrics"`
		Tests   RepositoryTests   `json:"tests"`
	} `json:"before"`
	After struct {
		Metrics RepositoryMetrics `json:"metrics"`
		Tests   RepositoryTests   `json:"tests"`
	} `json:"after"`
	Comparison            Comparison            `json:"comparison"`
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

func main() {
	fmt.Println("🔬 Starting IWRR Balancer Evaluation...")
	fmt.Println(strings.Repeat("=", 60))

	startTime := time.Now()

	dateStr := startTime.Format("2006-01-02")
	timeStr := startTime.Format("15-04-05")
	reportsDir := filepath.Join("reports", dateStr, timeStr)
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		fmt.Printf("Error creating reports directory: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n📊 Running tests on BEFORE repository...")
	fmt.Println(strings.Repeat("-", 40))
	beforeOutput, _ := runTests("before")
	beforeTests := parseTestResults(beforeOutput)
	beforePassed := countPassed(beforeTests)
	beforeFailed := countFailed(beforeTests)
	fmt.Printf("   Results: %d passed, %d failed\n", beforePassed, beforeFailed)

	fmt.Println("\n📊 Running tests on AFTER repository...")
	fmt.Println(strings.Repeat("-", 40))
	afterOutput, afterErr := runTests("after")
	afterTests := parseTestResults(afterOutput)
	afterPassed := countPassed(afterTests)
	afterFailed := countFailed(afterTests)
	fmt.Printf("   Results: %d passed, %d failed\n", afterPassed, afterFailed)

	checklist := checkRequirements(afterTests, afterOutput)
	beforeChecklist := checkRequirements(beforeTests, beforeOutput)

	success := afterFailed == 0 && afterPassed > 0

	report := EvaluationReport{}

	report.EvaluationMetadata.EvaluationID = generateID()
	report.EvaluationMetadata.Timestamp = startTime.Format(time.RFC3339Nano)
	report.EvaluationMetadata.Evaluator = "automated_test_suite"
	report.EvaluationMetadata.Project = "consistent_weighted_round_robin"
	report.EvaluationMetadata.Version = "1.0.0"

	report.Environment.GoVersion = getGoVersion()
	report.Environment.Platform = runtime.GOOS
	report.Environment.OS = runtime.GOOS
	report.Environment.OSRelease = getOSRelease()
	report.Environment.Architecture = runtime.GOARCH
	report.Environment.Hostname = getHostname()
	report.Environment.GitCommit = getGitCommit()
	report.Environment.GitBranch = getGitBranch()

	exitCode := 0
	if afterErr != nil {
		exitCode = 1
	}

	report.TestExecution.Success = success
	report.TestExecution.ExitCode = exitCode
	report.TestExecution.Tests = afterTests
	report.TestExecution.Summary = TestSummary{
		Total:   len(afterTests),
		Passed:  afterPassed,
		Failed:  afterFailed,
		Errors:  0,
		Skipped: 0,
	}
	report.TestExecution.Stdout = fmt.Sprintf("Before Repository: %d/%d passed\nAfter Repository: %d/%d passed",
		beforePassed, len(beforeTests), afterPassed, len(afterTests))
	report.TestExecution.Stderr = ""

	report.MetaTesting.RequirementTraceability = RequirementTraceability{
		Coverage:           "requirement_1",
		SequenceContinuity: "requirement_2",
		GCDFlux:            "requirement_3",
		HealthFlaps:        "requirement_4",
		Concurrency:        "requirement_5",
		AdversarialZero:    "requirement_6",
		BoundarySlice:      "requirement_7",
		SubTests:           "requirement_8",
		SequenceAuditor:    "requirement_9",
	}
	report.MetaTesting.AdversarialTesting = AdversarialTesting{
		ZeroWeights:    "requirement_6",
		SliceReduction: "requirement_7",
		HealthToggle:   "requirement_4",
	}
	report.MetaTesting.EdgeCaseCoverage = EdgeCaseCoverage{
		EmptyNodes:   "edge_case",
		SingleNode:   "edge_case",
		AllUnhealthy: "edge_case",
	}

	report.ComplianceCheck = ComplianceCheck{
		Coverage100Percent:      checklist.Req1Coverage,
		SequenceContinuityFixed: checklist.Req2SequenceContinuity,
		GCDFluxFixed:            checklist.Req3GCDFlux,
		HealthFlapsFixed:        checklist.Req4HealthFlaps,
		ConcurrencyFixed:        checklist.Req5Concurrency,
		AdversarialZeroFixed:    checklist.Req6AdversarialZero,
		BoundarySliceFixed:      checklist.Req7BoundarySlice,
		SubTestsStructureFixed:  checklist.Req8SubTests,
		SequenceAuditorFixed:    checklist.Req9SequenceAuditor,
	}

	report.Before.Metrics = RepositoryMetrics{
		TotalFiles:                1,
		Coverage100Percent:        beforeChecklist.Req1Coverage,
		SequenceContinuityWorking: beforeChecklist.Req2SequenceContinuity,
		GCDFluxWorking:            beforeChecklist.Req3GCDFlux,
		HealthFlapsWorking:        beforeChecklist.Req4HealthFlaps,
		ConcurrencyWorking:        beforeChecklist.Req5Concurrency,
		AdversarialZeroWorking:    beforeChecklist.Req6AdversarialZero,
		BoundarySliceWorking:      beforeChecklist.Req7BoundarySlice,
		SubTestsStructure:         beforeChecklist.Req8SubTests,
		SequenceAuditorWorking:    beforeChecklist.Req9SequenceAuditor,
	}
	report.Before.Tests = RepositoryTests{
		Passed:  beforePassed,
		Failed:  beforeFailed,
		Total:   len(beforeTests),
		Success: beforeFailed == 0 && beforePassed > 0,
		Tests:   beforeTests,
		Output:  beforeOutput,
	}

	report.After.Metrics = RepositoryMetrics{
		TotalFiles:                1,
		Coverage100Percent:        checklist.Req1Coverage,
		SequenceContinuityWorking: checklist.Req2SequenceContinuity,
		GCDFluxWorking:            checklist.Req3GCDFlux,
		HealthFlapsWorking:        checklist.Req4HealthFlaps,
		ConcurrencyWorking:        checklist.Req5Concurrency,
		AdversarialZeroWorking:    checklist.Req6AdversarialZero,
		BoundarySliceWorking:      checklist.Req7BoundarySlice,
		SubTestsStructure:         checklist.Req8SubTests,
		SequenceAuditorWorking:    checklist.Req9SequenceAuditor,
	}
	report.After.Tests = RepositoryTests{
		Passed:  afterPassed,
		Failed:  afterFailed,
		Total:   len(afterTests),
		Success: afterFailed == 0 && afterPassed > 0,
		Tests:   afterTests,
		Output:  afterOutput,
	}

	report.Comparison = Comparison{
		CoverageFixed:           checklist.Req1Coverage && !beforeChecklist.Req1Coverage,
		SequenceContinuityFixed: checklist.Req2SequenceContinuity,
		GCDFluxFixed:            checklist.Req3GCDFlux && !beforeChecklist.Req3GCDFlux,
		HealthFlapsFixed:        checklist.Req4HealthFlaps,
		ConcurrencyFixed:        checklist.Req5Concurrency,
		AdversarialZeroFixed:    checklist.Req6AdversarialZero,
		BoundarySliceFixed:      checklist.Req7BoundarySlice,
		TestsPassing:            afterPassed,
		TestImprovement:         afterPassed - beforePassed,
		AllRequirementsMet:      countReqs(checklist) == 9,
	}

	report.RequirementsChecklist = checklist

	allReqsMet := countReqs(checklist) == 9

	report.FinalVerdict.Success = success && allReqsMet
	report.FinalVerdict.TotalTests = len(afterTests)
	report.FinalVerdict.PassedTests = afterPassed
	report.FinalVerdict.FailedTests = afterFailed
	if len(afterTests) > 0 {
		report.FinalVerdict.SuccessRate = fmt.Sprintf("%.1f", float64(afterPassed)/float64(len(afterTests))*100)
	} else {
		report.FinalVerdict.SuccessRate = "0.0"
	}
	report.FinalVerdict.MeetsRequirements = allReqsMet

	reportFile := filepath.Join(reportsDir, "report.json")
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportFile, reportJSON, 0644)

	printSummary(report, reportFile, startTime, checklist)

	if !report.FinalVerdict.Success {
		os.Exit(1)
	}
}

func runTests(version string) (string, error) {
	testsDir := "/app/tests"

	var replaceDir string
	if version == "before" {
		replaceDir = "../repository_before"
	} else {
		replaceDir = "../repository_after"
	}

	modContent := fmt.Sprintf(`module tests

go 1.21

require repository v0.0.0

replace repository => %s
`, replaceDir)

	if err := os.WriteFile(filepath.Join(testsDir, "go.mod"), []byte(modContent), 0644); err != nil {
		return fmt.Sprintf("failed to write go.mod: %v", err), err
	}

	tidyCmd := exec.Command("go", "mod", "tidy")
	tidyCmd.Dir = testsDir
	tidyCmd.Env = append(os.Environ(), "CGO_ENABLED=1")
	tidyCmd.Run()

	cmd := exec.Command("go", "test", "-v", "-race", "-timeout", "60s", "./...")
	cmd.Dir = testsDir
	cmd.Env = append(os.Environ(), "CGO_ENABLED=1")

	output, err := cmd.CombinedOutput()
	return string(output), err
}

func printSummary(report EvaluationReport, reportFile string, startTime time.Time, checklist RequirementsChecklist) {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("🎯 EVALUATION RESULTS")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("📁 Report saved: %s\n", reportFile)
	fmt.Printf("🕐 Duration: %v\n", time.Since(startTime))
	fmt.Println()
	fmt.Println("📊 TEST SUMMARY:")
	fmt.Println(strings.Repeat("-", 40))
	fmt.Printf("   BEFORE VERSION: %d/%d passed (%d failed)\n",
		report.Before.Tests.Passed, report.Before.Tests.Total, report.Before.Tests.Failed)
	fmt.Printf("   AFTER VERSION:  %d/%d passed (%d failed)\n",
		report.After.Tests.Passed, report.After.Tests.Total, report.After.Tests.Failed)
	fmt.Println()
	fmt.Println("📋 REQUIREMENTS CHECKLIST:")
	fmt.Println(strings.Repeat("-", 40))
	printReq("1. 100% Coverage", checklist.Req1Coverage)
	printReq("2. Sequence Continuity", checklist.Req2SequenceContinuity)
	printReq("3. GCD Flux", checklist.Req3GCDFlux)
	printReq("4. Health Flaps Fairness", checklist.Req4HealthFlaps)
	printReq("5. Concurrency & Race", checklist.Req5Concurrency)
	printReq("6. Adversarial Zero Weights", checklist.Req6AdversarialZero)
	printReq("7. Boundary Slice Reduction", checklist.Req7BoundarySlice)
	printReq("8. Sub-tests Structure", checklist.Req8SubTests)
	printReq("9. Sequence Auditor Helper", checklist.Req9SequenceAuditor)
	fmt.Println()
	fmt.Println(strings.Repeat("=", 60))
	if report.FinalVerdict.Success {
		fmt.Println("✅ EVALUATION SUCCESS: All requirements met!")
	} else {
		fmt.Println("❌ EVALUATION FAILED: Some requirements not met")
	}
	fmt.Printf("🔧 Requirements Met: %d/9\n", countReqs(checklist))
	fmt.Println(strings.Repeat("=", 60))
}

func printReq(name string, passed bool) {
	icon := "❌"
	if passed {
		icon = "✅"
	}
	fmt.Printf("   %s %s\n", icon, name)
}

func parseTestResults(output string) []TestResult {
	var results []TestResult
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "--- PASS:") {
			name := extractTestName(line, "--- PASS:")
			duration := extractDuration(line)
			results = append(results, TestResult{Name: name, Status: "PASS", Duration: duration})
		} else if strings.Contains(line, "--- FAIL:") {
			name := extractTestName(line, "--- FAIL:")
			duration := extractDuration(line)
			results = append(results, TestResult{Name: name, Status: "FAIL", Duration: duration})
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

func countPassed(tests []TestResult) int {
	count := 0
	for _, t := range tests {
		if t.Status == "PASS" {
			count++
		}
	}
	return count
}

func countFailed(tests []TestResult) int {
	count := 0
	for _, t := range tests {
		if t.Status == "FAIL" {
			count++
		}
	}
	return count
}

func checkRequirements(tests []TestResult, output string) RequirementsChecklist {
	testPassed := func(fragment string) bool {
		for _, t := range tests {
			if strings.Contains(t.Name, fragment) && t.Status == "PASS" {
				return true
			}
		}
		return false
	}

	hasSubTests := strings.Contains(output, "TestStaticDistribution/") &&
		strings.Contains(output, "TestDynamicTransitions/")

	return RequirementsChecklist{
		Req1Coverage:           testPassed("Coverage") || testPassed("AllBranches"),
		Req2SequenceContinuity: testPassed("SequenceContinuity"),
		Req3GCDFlux:            testPassed("GCDFlux"),
		Req4HealthFlaps:        testPassed("HealthFlaps") || testPassed("Fairness"),
		Req5Concurrency:        testPassed("Concurrent") || testPassed("Concurrency"),
		Req6AdversarialZero:    testPassed("Adversarial") || testPassed("ZeroWeights"),
		Req7BoundarySlice:      testPassed("Boundary") || testPassed("SliceReduction"),
		Req8SubTests:           hasSubTests,
		Req9SequenceAuditor:    testPassed("SequenceAuditor") || testPassed("Auditor"),
	}
}

func countReqs(c RequirementsChecklist) int {
	count := 0
	if c.Req1Coverage {
		count++
	}
	if c.Req2SequenceContinuity {
		count++
	}
	if c.Req3GCDFlux {
		count++
	}
	if c.Req4HealthFlaps {
		count++
	}
	if c.Req5Concurrency {
		count++
	}
	if c.Req6AdversarialZero {
		count++
	}
	if c.Req7BoundarySlice {
		count++
	}
	if c.Req8SubTests {
		count++
	}
	if c.Req9SequenceAuditor {
		count++
	}
	return count
}

func generateID() string {
	t := time.Now().UnixNano()
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 12)
	for i := range b {
		b[i] = charset[(t+int64(i))%int64(len(charset))]
	}
	return string(b)
}

func getGoVersion() string {
	cmd := exec.Command("go", "version")
	output, _ := cmd.Output()
	return strings.TrimSpace(string(output))
}

func getHostname() string {
	hostname, _ := os.Hostname()
	return hostname
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