package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

// ==================== Report Structures ====================

type EvaluationMetadata struct {
	EvaluationID string `json:"evaluation_id"`
	Timestamp    string `json:"timestamp"`
	Evaluator    string `json:"evaluator"`
	Project      string `json:"project"`
	Version      string `json:"version"`
}

type Environment struct {
	GoVersion    string `json:"go_version"`
	Platform     string `json:"platform"`
	Architecture string `json:"architecture"`
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
	Output  string `json:"output"`
}

type TestResult struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	Duration string `json:"duration"`
}

type TestsReport struct {
	Passed  int          `json:"passed"`
	Failed  int          `json:"failed"`
	Total   int          `json:"total"`
	Success bool         `json:"success"`
	Tests   []TestResult `json:"tests"`
	Output  string       `json:"output"`
}

type RequirementsChecklist struct {
	Req1Coverage            bool `json:"req1_coverage"`
	Req2SequenceContinuity  bool `json:"req2_sequence_continuity"`
	Req3GCDFlux             bool `json:"req3_gcd_flux"`
	Req4HealthFlaps         bool `json:"req4_health_flaps"`
	Req5Concurrency         bool `json:"req5_concurrency"`
	Req6AdversarialZero     bool `json:"req6_adversarial_zero"`
	Req7BoundarySlice       bool `json:"req7_boundary_slice"`
	Req8SubTests            bool `json:"req8_subtests"`
	Req9SequenceAuditor     bool `json:"req9_sequence_auditor"`
}

type FinalVerdict struct {
	Success           bool   `json:"success"`
	TotalTests        int    `json:"total_tests"`
	PassedTests       int    `json:"passed_tests"`
	FailedTests       int    `json:"failed_tests"`
	SuccessRate       string `json:"success_rate"`
	MeetsRequirements bool   `json:"meets_requirements"`
	RequirementsMet   int    `json:"requirements_met"`
}

type EvaluationReport struct {
	EvaluationMetadata    EvaluationMetadata    `json:"evaluation_metadata"`
	Environment           Environment           `json:"environment"`
	CoverageReport        CoverageReport        `json:"coverage_report"`
	RaceDetectorReport    RaceDetectorReport    `json:"race_detector_report"`
	RepositoryTests       TestsReport           `json:"repository_tests"`
	MetaTests             TestsReport           `json:"meta_tests"`
	RequirementsChecklist RequirementsChecklist `json:"requirements_checklist"`
	FinalVerdict          FinalVerdict          `json:"final_verdict"`
}

// ==================== Helper Functions ====================

func generateEvaluationID() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 12)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
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

func runTests(dir string) (string, int, int) {
	cmd := exec.Command("go", "test", "-v", "./...")
	cmd.Dir = dir
	output, _ := cmd.CombinedOutput()
	outStr := string(output)

	passed := strings.Count(outStr, "--- PASS:")
	failed := strings.Count(outStr, "--- FAIL:")

	return outStr, passed, failed
}

func runTestsWithRace(dir string) (string, bool) {
	cmd := exec.Command("go", "test", "-race", "-timeout", "120s", "./...")
	cmd.Dir = dir
	output, _ := cmd.CombinedOutput()
	outStr := string(output)
	
	// Race detector passes if no "DATA RACE" found in output
	hasDataRace := strings.Contains(outStr, "DATA RACE")
	
	return outStr, !hasDataRace
}

func runCoverage(dir string) (float64, string) {
	cmd := exec.Command("go", "test", "-cover", "-coverprofile=/tmp/coverage.out", "./...")
	cmd.Dir = dir
	output, _ := cmd.CombinedOutput()
	outStr := string(output)

	re := regexp.MustCompile(`coverage:\s+(\d+\.?\d*)%`)
	matches := re.FindStringSubmatch(outStr)
	if len(matches) >= 2 {
		var pct float64
		fmt.Sscanf(matches[1], "%f", &pct)
		return pct, outStr
	}
	return 0, outStr
}

func parseTestResults(output string) []TestResult {
	var results []TestResult
	lines := strings.Split(output, "\n")

	passRegex := regexp.MustCompile(`--- (PASS|FAIL): (\S+) \(([^)]+)\)`)

	for _, line := range lines {
		if match := passRegex.FindStringSubmatch(line); match != nil {
			results = append(results, TestResult{
				Name:     match[2],
				Status:   match[1],
				Duration: match[3],
			})
		}
	}

	return results
}

func checkTestExists(output string, testName string) bool {
	return strings.Contains(output, testName)
}

func evaluateRequirements(output string, coveragePct float64) RequirementsChecklist {
	return RequirementsChecklist{
		Req1Coverage:            coveragePct >= 100.0,
		Req2SequenceContinuity:  checkTestExists(output, "SequenceContinuity"),
		Req3GCDFlux:             checkTestExists(output, "GCDFlux"),
		Req4HealthFlaps:         checkTestExists(output, "HealthFlap"),
		Req5Concurrency:         checkTestExists(output, "RaceDetection") || checkTestExists(output, "Concurrency"),
		Req6AdversarialZero:     checkTestExists(output, "ZeroWeight"),
		Req7BoundarySlice:       checkTestExists(output, "SliceSizeReduction") || checkTestExists(output, "Boundary"),
		Req8SubTests:            checkTestExists(output, "TestStaticDistribution") && checkTestExists(output, "TestDynamicTransition"),
		Req9SequenceAuditor:     checkTestExists(output, "SequenceAuditor") || checkTestExists(output, "Auditor"),
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())

	fmt.Println("=" + strings.Repeat("=", 69))
	fmt.Println("🔍 DynamicWeightedBalancer Test Coverage Evaluation")
	fmt.Println("=" + strings.Repeat("=", 69))

	// Initialize report
	report := EvaluationReport{
		EvaluationMetadata: EvaluationMetadata{
			EvaluationID: generateEvaluationID(),
			Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
			Evaluator:    "automated_test_suite",
			Project:      "weighted_round_robin_testing",
			Version:      "1.0.0",
		},
		Environment: Environment{
			GoVersion:    getGoVersion(),
			Platform:     runtime.GOOS,
			Architecture: runtime.GOARCH,
		},
	}

	// ==================== Run Coverage ====================
	fmt.Println("\n📊 Running Coverage Analysis...")
	coveragePct, coverageOutput := runCoverage("/app/repository_after")
	report.CoverageReport = CoverageReport{
		Percent:      coveragePct,
		Is100Percent: coveragePct >= 100.0,
		Output:       coverageOutput,
	}
	fmt.Printf("   Coverage: %.1f%%\n", coveragePct)
	if coveragePct >= 100.0 {
		fmt.Println("   ✅ 100% coverage achieved!")
	} else {
		fmt.Printf("   ⚠️  Coverage below 100%% (got %.1f%%)\n", coveragePct)
	}

	// ==================== Run Race Detector ====================
	fmt.Println("\n🔒 Running Race Detector...")
	raceOutput, racePassed := runTestsWithRace("/app/repository_after")
	report.RaceDetectorReport = RaceDetectorReport{
		Enabled: true,
		Passed:  racePassed,
		Command: "go test -race -timeout 120s ./...",
		Output:  raceOutput,
	}
	fmt.Printf("   Race Detector: %s\n", map[bool]string{true: "PASSED", false: "FAILED"}[racePassed])
	
	if !racePassed {
		fmt.Println("   ❌ Data race detected!")
	}

	// ==================== Run Repository Tests ====================
	fmt.Println("\n📋 Running Repository Tests...")
	repoOutput, repoPassed, repoFailed := runTests("/app/repository_after")
	repoTotal := repoPassed + repoFailed

	report.RepositoryTests = TestsReport{
		Passed:  repoPassed,
		Failed:  repoFailed,
		Total:   repoTotal,
		Success: repoFailed == 0 && repoPassed > 0,
		Tests:   parseTestResults(repoOutput),
		Output:  repoOutput,
	}
	fmt.Printf("   Repository Tests: %d passed, %d failed\n", repoPassed, repoFailed)

	if repoFailed > 0 {
		fmt.Println("\n   ❌ FAILED TESTS:")
		for _, test := range report.RepositoryTests.Tests {
			if test.Status == "FAIL" {
				fmt.Printf("      - %s\n", test.Name)
			}
		}
	}

	// ==================== Run Meta Tests ====================
	fmt.Println("\n📋 Running Meta Tests...")
	metaOutput, metaPassed, metaFailed := runTests("/app/tests")
	metaTotal := metaPassed + metaFailed

	report.MetaTests = TestsReport{
		Passed:  metaPassed,
		Failed:  metaFailed,
		Total:   metaTotal,
		Success: metaFailed == 0 && metaPassed > 0,
		Tests:   parseTestResults(metaOutput),
		Output:  metaOutput,
	}
	fmt.Printf("   Meta Tests: %d passed, %d failed\n", metaPassed, metaFailed)

	if metaFailed > 0 {
		fmt.Println("\n   ❌ FAILED META TESTS:")
		for _, test := range report.MetaTests.Tests {
			if test.Status == "FAIL" {
				fmt.Printf("      - %s\n", test.Name)
			}
		}
	}

	// ==================== Evaluate Requirements ====================
	report.RequirementsChecklist = evaluateRequirements(repoOutput, coveragePct)

	// Count requirements met
	reqMet := 0
	if report.RequirementsChecklist.Req1Coverage {
		reqMet++
	}
	if report.RequirementsChecklist.Req2SequenceContinuity {
		reqMet++
	}
	if report.RequirementsChecklist.Req3GCDFlux {
		reqMet++
	}
	if report.RequirementsChecklist.Req4HealthFlaps {
		reqMet++
	}
	if report.RequirementsChecklist.Req5Concurrency {
		reqMet++
	}
	if report.RequirementsChecklist.Req6AdversarialZero {
		reqMet++
	}
	if report.RequirementsChecklist.Req7BoundarySlice {
		reqMet++
	}
	if report.RequirementsChecklist.Req8SubTests {
		reqMet++
	}
	if report.RequirementsChecklist.Req9SequenceAuditor {
		reqMet++
	}

	totalRequirements := 9

	// ==================== Print Requirements Summary ====================
	fmt.Println("\n📋 Requirements Status:")
	printReq := func(num int, name string, passed bool) {
		status := "✅"
		if !passed {
			status = "❌"
		}
		fmt.Printf("   %s Req %d: %s\n", status, num, name)
	}
	printReq(1, "100% statement and branch coverage", report.RequirementsChecklist.Req1Coverage)
	printReq(2, "Sequence Continuity test", report.RequirementsChecklist.Req2SequenceContinuity)
	printReq(3, "GCD Flux test", report.RequirementsChecklist.Req3GCDFlux)
	printReq(4, "Health Flaps test", report.RequirementsChecklist.Req4HealthFlaps)
	printReq(5, "Concurrency & Race Detection", report.RequirementsChecklist.Req5Concurrency)
	printReq(6, "Adversarial zero weights", report.RequirementsChecklist.Req6AdversarialZero)
	printReq(7, "Boundary slice reduction", report.RequirementsChecklist.Req7BoundarySlice)
	printReq(8, "Sub-tests isolation", report.RequirementsChecklist.Req8SubTests)
	printReq(9, "Sequence Auditor helper", report.RequirementsChecklist.Req9SequenceAuditor)

	// Total tests
	totalTests := repoTotal + metaTotal
	totalPassed := repoPassed + metaPassed
	totalFailed := repoFailed + metaFailed

	// Calculate success rate
	successRate := "0.0%"
	if totalTests > 0 {
		successRate = fmt.Sprintf("%.1f%%", float64(totalPassed)/float64(totalTests)*100)
	}

	// Success criteria
	evaluationSuccess := racePassed && repoFailed == 0 && repoPassed > 0 && metaFailed == 0

	report.FinalVerdict = FinalVerdict{
		Success:           evaluationSuccess,
		TotalTests:        totalTests,
		PassedTests:       totalPassed,
		FailedTests:       totalFailed,
		SuccessRate:       successRate,
		MeetsRequirements: reqMet == totalRequirements,
		RequirementsMet:   reqMet,
	}

	// ==================== Save Report ====================
	now := time.Now().UTC()
	dateDir := now.Format("2006-01-02")
	timeDir := now.Format("15-04-05")
	reportDir := filepath.Join("/app/evaluation/reports", dateDir, timeDir)

	if err := os.MkdirAll(reportDir, 0755); err != nil {
		fmt.Printf("Error creating report directory: %v\n", err)
	}

	reportPath := filepath.Join(reportDir, "report.json")
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	if err := os.WriteFile(reportPath, reportJSON, 0644); err != nil {
		fmt.Printf("Error writing report: %v\n", err)
	}

	// ==================== Print Summary ====================
	fmt.Println("\n" + strings.Repeat("=", 70))
	fmt.Println("📊 EVALUATION SUMMARY")
	fmt.Println(strings.Repeat("=", 70))
	fmt.Printf("   Go Version:    %s\n", report.Environment.GoVersion)
	fmt.Printf("   Platform:      %s/%s\n", report.Environment.Platform, report.Environment.Architecture)
	fmt.Printf("   Coverage:      %.1f%%\n", coveragePct)
	fmt.Printf("   Race Detector: %s\n", map[bool]string{true: "PASSED", false: "FAILED"}[racePassed])
	fmt.Printf("   Repo Tests:    %d passed, %d failed\n", repoPassed, repoFailed)
	fmt.Printf("   Meta Tests:    %d passed, %d failed\n", metaPassed, metaFailed)
	fmt.Printf("   Requirements:  %d/%d met\n", reqMet, totalRequirements)
	fmt.Printf("   Success Rate:  %s\n", successRate)
	fmt.Println(strings.Repeat("=", 70))
	fmt.Printf("\n📁 Report saved to: %s\n", reportPath)

	// Print final status
	if evaluationSuccess {
		fmt.Println("\n🎉 EVALUATION PASSED!")
		fmt.Println("   ✅ Race detector passed")
		fmt.Println("   ✅ All repository tests passed")
		fmt.Println("   ✅ All meta tests passed")
	} else {
		fmt.Println("\n❌ EVALUATION FAILED")
		if !racePassed {
			fmt.Println("   ❌ Race detector failed")
		}
		if repoFailed > 0 {
			fmt.Printf("   ❌ %d repository tests failed\n", repoFailed)
		}
		if metaFailed > 0 {
			fmt.Printf("   ❌ %d meta tests failed\n", metaFailed)
		}
	}

	os.Exit(0)
}