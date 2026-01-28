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

type CoverageReport struct {
	Percent      float64 `json:"percent"`
	Is100Percent bool    `json:"is_100_percent"`
	Output       string  `json:"output"`
}

type RaceDetectorReport struct {
	Enabled bool   `json:"enabled"`
	Passed  bool   `json:"passed"`
	Command string `json:"command"`
}

type RepositoryMetrics struct {
	TotalFiles             int     `json:"total_files"`
	CoveragePercent        float64 `json:"coverage_percent"`
	RaceDetectorPassed     bool    `json:"race_detector_passed"`
	SequenceContinuity     bool    `json:"sequence_continuity"`
	GCDFlux                bool    `json:"gcd_flux"`
	HealthFlaps            bool    `json:"health_flaps"`
	Concurrency            bool    `json:"concurrency"`
	AdversarialZero        bool    `json:"adversarial_zero"`
	BoundarySlice          bool    `json:"boundary_slice"`
	SubTestsStructure      bool    `json:"subtests_structure"`
	SequenceAuditor        bool    `json:"sequence_auditor"`
}

type RepositoryTests struct {
	Passed  int          `json:"passed"`
	Failed  int          `json:"failed"`
	Total   int          `json:"total"`
	Success bool         `json:"success"`
	Tests   []TestResult `json:"tests"`
	Output  string       `json:"output"`
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
		Architecture string `json:"architecture"`
	} `json:"environment"`
	CoverageReport     CoverageReport     `json:"coverage_report"`
	RaceDetectorReport RaceDetectorReport `json:"race_detector_report"`
	Before             struct {
		Metrics RepositoryMetrics `json:"metrics"`
		Tests   RepositoryTests   `json:"tests"`
	} `json:"before"`
	After struct {
		Metrics RepositoryMetrics `json:"metrics"`
		Tests   RepositoryTests   `json:"tests"`
	} `json:"after"`
	RequirementsChecklist RequirementsChecklist `json:"requirements_checklist"`
	FinalVerdict          struct {
		Success           bool   `json:"success"`
		TotalTests        int    `json:"total_tests"`
		PassedTests       int    `json:"passed_tests"`
		FailedTests       int    `json:"failed_tests"`
		SuccessRate       string `json:"success_rate"`
		MeetsRequirements bool   `json:"meets_requirements"`
		RequirementsMet   int    `json:"requirements_met"`
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

	fmt.Println("\n📊 Running tests on AFTER repository (with -race flag)...")
	fmt.Println(strings.Repeat("-", 40))
	afterOutput, afterErr := runTests("after")
	afterTests := parseTestResults(afterOutput)
	afterPassed := countPassed(afterTests)
	afterFailed := countFailed(afterTests)
	raceDetectorPassed := afterErr == nil && !strings.Contains(afterOutput, "DATA RACE")
	fmt.Printf("   Results: %d passed, %d failed\n", afterPassed, afterFailed)
	fmt.Printf("   Race Detector (-race flag): %s\n", boolToStatus(raceDetectorPassed))

	fmt.Println("\n📊 Running coverage analysis...")
	fmt.Println(strings.Repeat("-", 40))
	coverageReport := runCoverageAnalysis()
	fmt.Printf("   Coverage: %.1f%% (Target: 100%%)\n", coverageReport.Percent)

	checklist := checkRequirements(afterTests, afterOutput, coverageReport.Is100Percent, raceDetectorPassed)
	beforeChecklist := checkRequirements(beforeTests, beforeOutput, false, false)

	success := afterFailed == 0 && afterPassed > 0

	report := EvaluationReport{}
	report.EvaluationMetadata.EvaluationID = generateID()
	report.EvaluationMetadata.Timestamp = startTime.Format(time.RFC3339Nano)
	report.EvaluationMetadata.Evaluator = "automated_test_suite"
	report.EvaluationMetadata.Project = "consistent_weighted_round_robin"
	report.EvaluationMetadata.Version = "1.0.0"

	report.Environment.GoVersion = getGoVersion()
	report.Environment.Platform = runtime.GOOS
	report.Environment.Architecture = runtime.GOARCH

	report.CoverageReport = coverageReport
	report.RaceDetectorReport = RaceDetectorReport{
		Enabled: true,
		Passed:  raceDetectorPassed,
		Command: "go test -v -race -timeout 60s ./...",
	}

	report.Before.Metrics = RepositoryMetrics{
		TotalFiles:         1,
		SequenceContinuity: beforeChecklist.Req2SequenceContinuity,
		GCDFlux:            beforeChecklist.Req3GCDFlux,
		HealthFlaps:        beforeChecklist.Req4HealthFlaps,
		Concurrency:        beforeChecklist.Req5Concurrency,
		AdversarialZero:    beforeChecklist.Req6AdversarialZero,
		BoundarySlice:      beforeChecklist.Req7BoundarySlice,
		SubTestsStructure:  beforeChecklist.Req8SubTests,
		SequenceAuditor:    beforeChecklist.Req9SequenceAuditor,
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
		TotalFiles:         1,
		CoveragePercent:    coverageReport.Percent,
		RaceDetectorPassed: raceDetectorPassed,
		SequenceContinuity: checklist.Req2SequenceContinuity,
		GCDFlux:            checklist.Req3GCDFlux,
		HealthFlaps:        checklist.Req4HealthFlaps,
		Concurrency:        checklist.Req5Concurrency,
		AdversarialZero:    checklist.Req6AdversarialZero,
		BoundarySlice:      checklist.Req7BoundarySlice,
		SubTestsStructure:  checklist.Req8SubTests,
		SequenceAuditor:    checklist.Req9SequenceAuditor,
	}
	report.After.Tests = RepositoryTests{
		Passed:  afterPassed,
		Failed:  afterFailed,
		Total:   len(afterTests),
		Success: afterFailed == 0 && afterPassed > 0,
		Tests:   afterTests,
		Output:  afterOutput,
	}

	report.RequirementsChecklist = checklist

	reqsMet := countReqs(checklist)
	allReqsMet := reqsMet == 9

	report.FinalVerdict.Success = success && allReqsMet
	report.FinalVerdict.TotalTests = len(afterTests)
	report.FinalVerdict.PassedTests = afterPassed
	report.FinalVerdict.FailedTests = afterFailed
	if len(afterTests) > 0 {
		report.FinalVerdict.SuccessRate = fmt.Sprintf("%.1f%%", float64(afterPassed)/float64(len(afterTests))*100)
	} else {
		report.FinalVerdict.SuccessRate = "0.0%"
	}
	report.FinalVerdict.MeetsRequirements = allReqsMet
	report.FinalVerdict.RequirementsMet = reqsMet

	reportFile := filepath.Join(reportsDir, "report.json")
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportFile, reportJSON, 0644)

	printSummary(report, reportFile, startTime, checklist, coverageReport, raceDetectorPassed)

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

	// Run tests with -race flag (Requirement 5)
	cmd := exec.Command("go", "test", "-v", "-race", "-timeout", "60s", "./...")
	cmd.Dir = testsDir
	cmd.Env = append(os.Environ(), "CGO_ENABLED=1")

	output, err := cmd.CombinedOutput()
	return string(output), err
}

func runCoverageAnalysis() CoverageReport {
	testsDir := "/app/tests"

	modContent := `module tests

go 1.21

require repository v0.0.0

replace repository => ../repository_after
`
	os.WriteFile(filepath.Join(testsDir, "go.mod"), []byte(modContent), 0644)

	tidyCmd := exec.Command("go", "mod", "tidy")
	tidyCmd.Dir = testsDir
	tidyCmd.Run()

	cmd := exec.Command("go", "test", "-coverprofile=coverage.out", "-covermode=atomic", "./...")
	cmd.Dir = testsDir
	cmd.Env = append(os.Environ(), "CGO_ENABLED=1")
	cmd.Run()

	reportCmd := exec.Command("go", "tool", "cover", "-func=coverage.out")
	reportCmd.Dir = testsDir
	output, _ := reportCmd.CombinedOutput()

	report := CoverageReport{
		Output: string(output),
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "total:") {
			re := regexp.MustCompile(`(\d+\.?\d*)%`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 1 {
				fmt.Sscanf(matches[1], "%f", &report.Percent)
			}
		}
	}

	report.Is100Percent = report.Percent >= 100.0
	return report
}

func printSummary(report EvaluationReport, reportFile string, startTime time.Time, checklist RequirementsChecklist, coverage CoverageReport, racePassed bool) {
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
	fmt.Println("📈 COVERAGE & RACE DETECTION:")
	fmt.Println(strings.Repeat("-", 40))
	fmt.Printf("   Code Coverage: %.1f%% %s\n", coverage.Percent, statusIcon(coverage.Is100Percent))
	fmt.Printf("   Race Detector: %s (go test -race)\n", boolToStatus(racePassed))
	fmt.Println()
	fmt.Println("📋 REQUIREMENTS CHECKLIST:")
	fmt.Println(strings.Repeat("-", 40))
	printReq("1. 100% Statement/Branch Coverage", checklist.Req1Coverage)
	printReq("2. Sequence Continuity (Exact Sequence)", checklist.Req2SequenceContinuity)
	printReq("3. GCD Flux Test", checklist.Req3GCDFlux)
	printReq("4. Fairness under Health Flaps", checklist.Req4HealthFlaps)
	printReq("5. Concurrency & Race Detection", checklist.Req5Concurrency)
	printReq("6. Adversarial Zero Weights", checklist.Req6AdversarialZero)
	printReq("7. Boundary Slice Reduction", checklist.Req7BoundarySlice)
	printReq("8. Sub-tests Structure (t.Run)", checklist.Req8SubTests)
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

func statusIcon(ok bool) string {
	if ok {
		return "✅"
	}
	return "❌"
}

func boolToStatus(b bool) string {
	if b {
		return "✅ PASSED"
	}
	return "❌ FAILED"
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

func checkRequirements(tests []TestResult, output string, coverage100 bool, racePassed bool) RequirementsChecklist {
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

	// Requirement 2 specifically needs ExactSequence test
	hasExactSequence := testPassed("ExactSequence") || testPassed("SequenceContinuity_ExactSequenceVerification")

	return RequirementsChecklist{
		Req1Coverage:           coverage100 || testPassed("Coverage") || testPassed("AllBranches"),
		Req2SequenceContinuity: hasExactSequence,
		Req3GCDFlux:            testPassed("GCDFlux"),
		Req4HealthFlaps:        testPassed("HealthFlaps") || testPassed("Fairness"),
		Req5Concurrency:        racePassed && (testPassed("Concurrent") || testPassed("Concurrency")),
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