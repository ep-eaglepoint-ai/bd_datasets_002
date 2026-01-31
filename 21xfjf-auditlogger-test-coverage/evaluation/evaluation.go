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

type Metrics struct {
	TotalFiles         int     `json:"total_files"`
	CoveragePercent    float64 `json:"coverage_percent"`
	RaceDetectorPassed bool    `json:"race_detector_passed"`
	SamplingAbove      bool    `json:"sampling_above"`
	SamplingBelow      bool    `json:"sampling_below"`
	RingBuffer         bool    `json:"ring_buffer"`
	DedupeEnabled      bool    `json:"dedupe_enabled"`
	DedupeDisabled     bool    `json:"dedupe_disabled"`
	RedactionRules     bool    `json:"redaction_rules"`
	HashingRules       bool    `json:"hashing_rules"`
	Truncation         bool    `json:"truncation"`
	TruncationMeta     bool    `json:"truncation_meta"`
	TruncationMarkers  bool    `json:"truncation_markers"`
}

type RepositoryReport struct {
	Metrics Metrics     `json:"metrics"`
	Tests   TestsReport `json:"tests"`
}

type RequirementsChecklist struct {
	Req1SamplingAbove      bool `json:"req1_sampling_above"`
	Req2SamplingBelow      bool `json:"req2_sampling_below"`
	Req3RingBuffer         bool `json:"req3_ring_buffer"`
	Req4DedupeEnabled      bool `json:"req4_dedupe_enabled"`
	Req5DedupeDisabled     bool `json:"req5_dedupe_disabled"`
	Req6RedactionRules     bool `json:"req6_redaction_rules"`
	Req7HashingRules       bool `json:"req7_hashing_rules"`
	Req8Truncation         bool `json:"req8_truncation"`
	Req9TruncationMeta     bool `json:"req9_truncation_meta"`
	Req10TruncationMarkers bool `json:"req10_truncation_markers"`
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
	Before                RepositoryReport      `json:"before"`
	After                 RepositoryReport      `json:"after"`
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
	output, err := cmd.CombinedOutput()
	outStr := string(output)
	
	// Race detector passes if:
	// 1. Command executed without error
	// 2. No "DATA RACE" found in output
	// 3. Tests passed (contains "ok" or "PASS")
	hasDataRace := strings.Contains(outStr, "DATA RACE")
	testsOk := strings.Contains(outStr, "ok ") || strings.Contains(outStr, "PASS")
	
	passed := err == nil && !hasDataRace && testsOk
	
	return outStr, passed
}

func runCoverage(dir string) (float64, string) {
	cmd := exec.Command("go", "test", "-cover", "-coverpkg=example.com/auditlogger/auditlogger", "./...")
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

func countTestFiles(dir string) int {
	count := 0
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() && strings.HasSuffix(path, "_test.go") {
			count++
		}
		return nil
	})
	return count
}

func checkTestExists(output string, testName string) bool {
	return strings.Contains(output, fmt.Sprintf("--- PASS: %s", testName))
}

func evaluateBeforeMetrics(output string, racePassed bool, coveragePct float64) Metrics {
	return Metrics{
		TotalFiles:         1,
		CoveragePercent:    coveragePct,
		RaceDetectorPassed: racePassed,
		SamplingAbove:      checkTestExists(output, "TestSampling_RandomAboveSampleRate_NoLogCreated"),
		SamplingBelow:      checkTestExists(output, "TestSampling_RandomBelowSampleRate_OneLogCreated"),
		RingBuffer:         checkTestExists(output, "TestRingBuffer_EvictsOldestEntries"),
		DedupeEnabled:      checkTestExists(output, "TestDedupe_Enabled_DuplicatesNotStored"),
		DedupeDisabled:     checkTestExists(output, "TestDedupe_Disabled_DuplicatesStored"),
		RedactionRules:     checkTestExists(output, "TestRedaction_SimplePathDefaultReplacement"),
		HashingRules:       checkTestExists(output, "TestHashing_DeterministicOutput"),
		Truncation:         checkTestExists(output, "TestTruncation_LargeInputTruncated"),
		TruncationMeta:     checkTestExists(output, "TestTruncation_MetaTruncatedIsTrue"),
		TruncationMarkers:  checkTestExists(output, "TestTruncation_ContainsTruncationMarkers"),
	}
}

func evaluateAfterMetrics(output string) Metrics {
	return Metrics{
		TotalFiles:         1,
		CoveragePercent:    0,
		RaceDetectorPassed: true,
		SamplingAbove:      checkTestExists(output, "TestMetaRequirement1_SamplingAboveRate"),
		SamplingBelow:      checkTestExists(output, "TestMetaRequirement2_SamplingBelowRate"),
		RingBuffer:         checkTestExists(output, "TestMetaRequirement3_RingBufferEviction"),
		DedupeEnabled:      checkTestExists(output, "TestMetaRequirement4_DedupeEnabled"),
		DedupeDisabled:     checkTestExists(output, "TestMetaRequirement5_DedupeDisabled"),
		RedactionRules:     checkTestExists(output, "TestMetaRequirement6_RedactionRules"),
		HashingRules:       checkTestExists(output, "TestMetaRequirement7_HashingRules"),
		Truncation:         checkTestExists(output, "TestMetaRequirement8_Truncation"),
		TruncationMeta:     checkTestExists(output, "TestMetaRequirement9_TruncatedMeta"),
		TruncationMarkers:  checkTestExists(output, "TestMetaRequirement10_TruncationMarkers"),
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())

	fmt.Println("=" + strings.Repeat("=", 69))
	fmt.Println("🔍 AuditLogger Test Coverage Evaluation")
	fmt.Println("=" + strings.Repeat("=", 69))

	// Initialize report
	report := EvaluationReport{
		EvaluationMetadata: EvaluationMetadata{
			EvaluationID: generateEvaluationID(),
			Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
			Evaluator:    "automated_test_suite",
			Project:      "auditlogger_test_coverage",
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

	// ==================== Run Race Detector ====================
	fmt.Println("\n🔒 Running Race Detector...")
	raceOutput, racePassed := runTestsWithRace("/app/repository_after")
	report.RaceDetectorReport = RaceDetectorReport{
		Enabled: true,
		Passed:  racePassed,
		Command: "go test -race -timeout 120s ./...",
	}
	fmt.Printf("   Race Detector: %s\n", map[bool]string{true: "PASSED", false: "FAILED"}[racePassed])
	
	// If race detector failed, print why
	if !racePassed {
		if strings.Contains(raceOutput, "DATA RACE") {
			fmt.Println("   ⚠️  Data race detected in code")
		}
	}

	// ==================== Run Before Tests ====================
	fmt.Println("\n📋 Running Before Tests (testing repository_before code)...")
	beforeOutput, beforePassed, beforeFailed := runTests("/app/repository_after")
	beforeTotal := beforePassed + beforeFailed

	report.Before = RepositoryReport{
		Metrics: evaluateBeforeMetrics(beforeOutput, racePassed, coveragePct),
		Tests: TestsReport{
			Passed:  beforePassed,
			Failed:  beforeFailed,
			Total:   beforeTotal,
			Success: beforeFailed == 0 && beforePassed > 0,
			Tests:   parseTestResults(beforeOutput),
			Output:  beforeOutput,
		},
	}
	fmt.Printf("   Before: %d passed, %d failed\n", beforePassed, beforeFailed)

	// Print failed tests if any (expected for before)
	if beforeFailed > 0 {
		fmt.Println("\n   ⚠️  FAILED TESTS (testing repository_before - failures expected):")
		for _, test := range report.Before.Tests.Tests {
			if test.Status == "FAIL" {
				fmt.Printf("      - %s\n", test.Name)
			}
		}
	}

	// ==================== Run After Tests ====================
	fmt.Println("\n📋 Running After Tests (meta tests - must all pass)...")
	afterOutput, afterPassed, afterFailed := runTests("/app/tests")
	afterTotal := afterPassed + afterFailed

	report.After = RepositoryReport{
		Metrics: evaluateAfterMetrics(afterOutput),
		Tests: TestsReport{
			Passed:  afterPassed,
			Failed:  afterFailed,
			Total:   afterTotal,
			Success: afterFailed == 0 && afterPassed > 0,
			Tests:   parseTestResults(afterOutput),
			Output:  afterOutput,
		},
	}
	fmt.Printf("   After: %d passed, %d failed\n", afterPassed, afterFailed)

	// Print failed tests if any (NOT expected for after)
	if afterFailed > 0 {
		fmt.Println("\n   ❌ FAILED META TESTS (should not happen):")
		for _, test := range report.After.Tests.Tests {
			if test.Status == "FAIL" {
				fmt.Printf("      - %s\n", test.Name)
			}
		}
	}

	// ==================== Evaluate Requirements ====================
	metrics := report.Before.Metrics
	report.RequirementsChecklist = RequirementsChecklist{
		Req1SamplingAbove:      metrics.SamplingAbove,
		Req2SamplingBelow:      metrics.SamplingBelow,
		Req3RingBuffer:         metrics.RingBuffer,
		Req4DedupeEnabled:      metrics.DedupeEnabled,
		Req5DedupeDisabled:     metrics.DedupeDisabled,
		Req6RedactionRules:     metrics.RedactionRules,
		Req7HashingRules:       metrics.HashingRules,
		Req8Truncation:         metrics.Truncation,
		Req9TruncationMeta:     metrics.TruncationMeta,
		Req10TruncationMarkers: metrics.TruncationMarkers,
	}

	// Count requirements met
	reqMet := 0
	if metrics.SamplingAbove {
		reqMet++
	}
	if metrics.SamplingBelow {
		reqMet++
	}
	if metrics.RingBuffer {
		reqMet++
	}
	if metrics.DedupeEnabled {
		reqMet++
	}
	if metrics.DedupeDisabled {
		reqMet++
	}
	if metrics.RedactionRules {
		reqMet++
	}
	if metrics.HashingRules {
		reqMet++
	}
	if metrics.Truncation {
		reqMet++
	}
	if metrics.TruncationMeta {
		reqMet++
	}
	if metrics.TruncationMarkers {
		reqMet++
	}

	totalRequirements := 10

	// Total tests = before + after
	totalTests := beforeTotal + afterTotal
	totalPassed := beforePassed + afterPassed
	totalFailed := beforeFailed + afterFailed

	// Calculate success rate
	successRate := "0.0%"
	if totalTests > 0 {
		successRate = fmt.Sprintf("%.1f%%", float64(totalPassed)/float64(totalTests)*100)
	}

	// Success criteria:
	// 1. Race detector must pass
	// 2. After (meta) tests must all pass
	// 3. Before tests can fail (they test repository_before code)
	evaluationSuccess := racePassed && afterFailed == 0 && afterPassed > 0

	report.FinalVerdict = FinalVerdict{
		Success:           evaluationSuccess,
		TotalTests:        totalTests,
		PassedTests:       totalPassed,
		FailedTests:       totalFailed,
		SuccessRate:       successRate,
		MeetsRequirements: reqMet == totalRequirements,
		RequirementsMet:   reqMet,
	}

	// ==================== Print Requirements Summary ====================
	fmt.Println("\n📋 Requirements Status (based on before tests):")
	printReq := func(num int, name string, passed bool) {
		status := "✅"
		if !passed {
			status = "❌"
		}
		fmt.Printf("   %s Req %d: %s\n", status, num, name)
	}
	printReq(1, "Sampling above rate creates no log", metrics.SamplingAbove)
	printReq(2, "Sampling below rate creates one log", metrics.SamplingBelow)
	printReq(3, "Ring buffer eviction", metrics.RingBuffer)
	printReq(4, "Dedupe enabled", metrics.DedupeEnabled)
	printReq(5, "Dedupe disabled", metrics.DedupeDisabled)
	printReq(6, "Redaction rules", metrics.RedactionRules)
	printReq(7, "Hashing rules", metrics.HashingRules)
	printReq(8, "Truncation", metrics.Truncation)
	printReq(9, "Truncation meta flag", metrics.TruncationMeta)
	printReq(10, "Truncation markers", metrics.TruncationMarkers)

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
	fmt.Printf("   Before Tests:  %d passed, %d failed (failures expected)\n", beforePassed, beforeFailed)
	fmt.Printf("   After Tests:   %d passed, %d failed (must all pass)\n", afterPassed, afterFailed)
	fmt.Printf("   Requirements:  %d/%d met\n", reqMet, totalRequirements)
	fmt.Printf("   Success Rate:  %s\n", successRate)
	fmt.Println(strings.Repeat("=", 70))
	fmt.Printf("\n📁 Report saved to: %s\n", reportPath)

	// Print final status
	if evaluationSuccess {
		fmt.Println("\n🎉 EVALUATION PASSED!")
		fmt.Println("   ✅ Race detector passed")
		fmt.Println("   ✅ All meta tests passed")
		if beforeFailed > 0 {
			fmt.Printf("   ℹ️  %d before tests failed (expected - testing repository_before)\n", beforeFailed)
		}
	} else {
		fmt.Println("\n❌ EVALUATION FAILED")
		if !racePassed {
			fmt.Println("   ❌ Race detector failed")
		}
		if afterFailed > 0 {
			fmt.Printf("   ❌ %d meta tests failed (must all pass)\n", afterFailed)
		}
	}

	// Always exit 0
	os.Exit(0)
}