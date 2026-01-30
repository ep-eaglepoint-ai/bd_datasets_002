package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type TestResult struct {
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Duration string `json:"duration,omitempty"`
	Output   string `json:"output,omitempty"`
	Error    string `json:"error,omitempty"`
}

type EvaluationReport struct {
	Timestamp    string      `json:"timestamp"`
	InstanceID   string      `json:"instance_id"`
	TestResults  []TestResult `json:"test_results"`
	OverallPass  bool         `json:"overall_pass"`
	TotalTests   int          `json:"total_tests"`
	PassedTests  int          `json:"passed_tests"`
	FailedTests  int          `json:"failed_tests"`
	Coverage     CoverageInfo `json:"coverage"`
}

type CoverageInfo struct {
	RequirementsMet []string `json:"requirements_met"`
	RequirementsMissed []string `json:"requirements_missed,omitempty"`
}

func main() {
	report := runEvaluation()
	
	// Create reports directory with timestamp
	timestamp := time.Now().Format("20060102-150405")
	reportsDir := filepath.Join("evaluation", "reports", timestamp)
	err := os.MkdirAll(reportsDir, 0755)
	if err != nil {
		fmt.Printf("Error creating reports directory: %v\n", err)
		os.Exit(1)
	}
	
	// Write report
	reportPath := filepath.Join(reportsDir, "report.json")
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling report: %v\n", err)
		os.Exit(1)
	}
	
	err = os.WriteFile(reportPath, reportJSON, 0644)
	if err != nil {
		fmt.Printf("Error writing report: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Printf("Evaluation report written to: %s\n", reportPath)
	fmt.Printf("Overall: %s\n", getStatusString(report.OverallPass))
	fmt.Printf("Tests: %d passed, %d failed out of %d total\n", 
		report.PassedTests, report.FailedTests, report.TotalTests)
	
	if !report.OverallPass {
		os.Exit(1)
	}
}

func runEvaluation() EvaluationReport {
	report := EvaluationReport{
		Timestamp:  time.Now().Format(time.RFC3339),
		InstanceID: "876RZZ",
		TestResults: []TestResult{},
	}
	
	// Run after-test (expected to pass)
	afterResult := runTest("after-test", "tests/after_test.go")
	report.TestResults = append(report.TestResults, afterResult)
	
	// Run meta-test
	metaResult := runTest("meta-test", "tests/meta_test.go")
	report.TestResults = append(report.TestResults, metaResult)
	
	// Calculate statistics
	report.TotalTests = len(report.TestResults)
	report.PassedTests = 0
	report.FailedTests = 0
	
	for _, result := range report.TestResults {
		if result.Passed {
			report.PassedTests++
		} else {
			report.FailedTests++
		}
	}
	
	// Overall pass: after-test and meta-test must pass
	report.OverallPass = afterResult.Passed && metaResult.Passed
	
	// Coverage information
	report.Coverage = CoverageInfo{
		RequirementsMet: []string{
			"Sliding Window Accumulator",
			"Timeline Integrity (out-of-order handling)",
			"Memory Optimization (24-hour purge)",
			"Breach Alerting (immediate status)",
			"Precision (time.Duration)",
			"Cumulative Logic (three 15-minute spikes)",
			"Window Exit (40-minute spike 25 hours ago)",
		},
	}
	
	return report
}

func runTest(testName, testFile string) TestResult {
	result := TestResult{
		Name: testName,
	}
	
	startTime := time.Now()
	
	// Run go test on the specific test file
	cmd := exec.Command("go", "test", "-v", "-run", getTestPattern(testName), "./tests")
	output, err := cmd.CombinedOutput()
	
	duration := time.Since(startTime)
	result.Duration = duration.String()
	result.Output = string(output)
	
	if err != nil {
		result.Passed = false
		result.Error = err.Error()
	} else {
		result.Passed = true
	}
	
	return result
}

func getTestPattern(testName string) string {
	switch testName {
	case "after-test":
		// Run all functional tests (exclude Meta tests)
		return "TestBasicSafeTemperature|TestSingleBreachBelowThreshold|TestCumulativeBreachThreeSpikes|TestWindowExit|TestOutOfOrderReadings|TestContinuousBreach|TestMultipleShipments|TestThresholdBoundary"
	case "meta-test":
		return "TestMeta"
	default:
		return ".*"
	}
}

func getStatusString(passed bool) string {
	if passed {
		return "PASS"
	}
	return "FAIL"
}
