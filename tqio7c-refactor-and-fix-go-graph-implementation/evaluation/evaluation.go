package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	REPO_BEFORE = "repository_before"
	REPO_AFTER  = "repository_after"
)

type TestResult struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Message string `json:"message,omitempty"`
}

type TestSuiteResult struct {
	Tests  []TestResult `json:"tests"`
	Passed int          `json:"passed"`
	Failed int          `json:"failed"`
	Total  int          `json:"total"`
	Success bool        `json:"success"`
	Output string       `json:"output,omitempty"`
}

type StructureMetrics struct {
	TotalFiles              int  `json:"total_files"`
	GraphFiles              int  `json:"graph_files"`
	HasGraphImplementation bool `json:"has_graph_implementation"`
	GraphLines              int  `json:"graph_lines"`
}

type TestResults struct {
	Success bool   `json:"success"`
	Passed  int    `json:"passed"`
	Failed  int    `json:"failed"`
	Total   int    `json:"total"`
	Output  string `json:"output,omitempty"`
	Tests   []TestResult `json:"tests,omitempty"`
}

type EvaluationReport struct {
	RunID      string    `json:"run_id"`
	StartedAt  string    `json:"started_at"`
	FinishedAt string    `json:"finished_at"`
	Environment EnvironmentInfo `json:"environment"`
	Before     BeforeAfterData `json:"before"`
	After      BeforeAfterData `json:"after"`
	Comparison ComparisonData  `json:"comparison"`
	Success    bool      `json:"success"`
}

type EnvironmentInfo struct {
	GoVersion string `json:"go_version"`
	Platform  string `json:"platform"`
}

type BeforeAfterData struct {
	Metrics StructureMetrics `json:"metrics"`
	Tests   TestResults      `json:"tests"`
}

type ComparisonData struct {
	FailToPass            []string `json:"fail_to_pass"`
	TestsFixed            int      `json:"tests_fixed"`
	TestsImproved         int      `json:"tests_improved"`
	StructureImproved     bool     `json:"structure_improved"`
	GraphImplementationExists bool `json:"graph_implementation_exists"`
}

func runTests(repoPath, repoName, baseDir string) TestResults {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("Running tests on %s\n", repoName)
	fmt.Println(strings.Repeat("=", 60))

	var output string
	passed := 0
	failed := 0
	total := 0

	// Set environment variable to tell tests which repo to check
	env := os.Environ()
	env = append(env, fmt.Sprintf("TEST_REPO_PATH=%s", repoPath))

	// Run the appropriate test file
	var testFile string
	if strings.Contains(strings.ToLower(repoName), "before") {
		testFile = filepath.Join(baseDir, "tests", "test_before.go")
	} else {
		testFile = filepath.Join(baseDir, "tests", "test_after.go")
	}

	cmd := exec.Command("go", "run", testFile)
	cmd.Dir = baseDir
	cmd.Env = env
	outputBytes, err := cmd.CombinedOutput()
	output = string(outputBytes)

	if err != nil {
		// Exit errors are expected for test failures
		if _, ok := err.(*exec.ExitError); !ok {
			output = fmt.Sprintf("Error running tests: %v\n%s", err, output)
		}
	}

	fmt.Println(output)

	// Parse results from JSON file
	var resultsFile string
	if strings.Contains(strings.ToLower(repoName), "before") {
		resultsFile = filepath.Join(baseDir, "tests", "test_before_results.json")
	} else {
		resultsFile = filepath.Join(baseDir, "tests", "test_after_results.json")
	}

	var testResults TestSuiteResult
	if data, err := os.ReadFile(resultsFile); err == nil {
		json.Unmarshal(data, &testResults)
		passed = testResults.Passed
		failed = testResults.Failed
		total = testResults.Total
	}

	fmt.Printf("\nParsed results: %d passed, %d failed, %d total\n", passed, failed, total)

	return TestResults{
		Success: failed == 0 && passed > 0,
		Passed:  passed,
		Failed:  failed,
		Total:   total,
		Output:  output,
		Tests:   testResults.Tests,
	}
}

func analyzeStructure(repoPath string) StructureMetrics {
	metrics := StructureMetrics{
		TotalFiles:              0,
		GraphFiles:              0,
		HasGraphImplementation: false,
		GraphLines:              0,
	}

	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		return metrics
	}

	// Check for Go graph implementation files
	graphFile := filepath.Join(repoPath, "graph_Implementation.go")
	if _, err := os.Stat(graphFile); err == nil {
		metrics.HasGraphImplementation = true
		metrics.GraphFiles = 1

		// Count lines
		if data, err := os.ReadFile(graphFile); err == nil {
			lines := strings.Split(string(data), "\n")
			metrics.GraphLines = len(lines)
		}
	}

	metrics.TotalFiles = metrics.GraphFiles

	return metrics
}

func generateReport(beforeResults, afterResults TestResults, beforeMetrics, afterMetrics StructureMetrics, baseDir string) map[string]interface{} {
	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15-04-05")

	reportDir := filepath.Join(baseDir, "evaluation", "reports", dateStr, timeStr)
	os.MkdirAll(reportDir, 0755)

	// Find fail-to-pass tests
	failToPass := []string{}
	beforeMap := make(map[string]bool)
	for _, test := range beforeResults.Tests {
		beforeMap[test.Name] = test.Passed
	}
	afterMap := make(map[string]bool)
	for _, test := range afterResults.Tests {
		afterMap[test.Name] = test.Passed
	}

	for testName, beforePassed := range beforeMap {
		if afterPassed, exists := afterMap[testName]; exists && !beforePassed && afterPassed {
			failToPass = append(failToPass, testName)
		}
	}

	// Get Go version
	goVersion := runtime.Version()
	platform := fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH)

	report := map[string]interface{}{
		"run_id": fmt.Sprintf("%d-%x", now.Unix(), []byte{byte(now.Nanosecond() % 256)}),
		"started_at":  now.Format(time.RFC3339),
		"finished_at": time.Now().Format(time.RFC3339),
		"environment": map[string]interface{}{
			"go_version": goVersion,
			"platform":   platform,
		},
		"before": map[string]interface{}{
			"metrics": beforeMetrics,
			"tests": map[string]interface{}{
				"passed":  beforeResults.Passed,
				"failed":  beforeResults.Failed,
				"total":   beforeResults.Total,
				"success": beforeResults.Success,
			},
		},
		"after": map[string]interface{}{
			"metrics": afterMetrics,
			"tests": map[string]interface{}{
				"passed":  afterResults.Passed,
				"failed":  afterResults.Failed,
				"total":   afterResults.Total,
				"success": afterResults.Success,
			},
		},
		"comparison": map[string]interface{}{
			"fail_to_pass":              failToPass,
			"tests_fixed":               len(failToPass),
			"tests_improved":            afterResults.Passed - beforeResults.Passed,
			"structure_improved":        !beforeMetrics.HasGraphImplementation && afterMetrics.HasGraphImplementation,
			"graph_implementation_exists": afterMetrics.HasGraphImplementation,
		},
		"success": !beforeResults.Success && afterResults.Success,
	}

	reportPath := filepath.Join(reportDir, "report.json")
	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportPath, data, 0644)

	// Also write to latest.json
	latestPath := filepath.Join(baseDir, "evaluation", "reports", "latest.json")
	os.WriteFile(latestPath, data, 0644)

	return map[string]interface{}{
		"report":     report,
		"report_path": reportPath,
	}
}

func main() {
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("Go Graph Implementation Refactor Evaluation")
	fmt.Println(strings.Repeat("=", 60))

	baseDir := "."
	if len(os.Args) > 1 {
		baseDir = os.Args[1]
	}

	repoBefore := filepath.Join(baseDir, REPO_BEFORE)
	repoAfter := filepath.Join(baseDir, REPO_AFTER)

	// Analyze structures
	fmt.Println("\n[1/5] Analyzing repository_before structure...")
	beforeMetrics := analyzeStructure(repoBefore)
	fmt.Printf("  - Graph implementation: %v\n", beforeMetrics.HasGraphImplementation)
	fmt.Printf("  - Graph lines: %d\n", beforeMetrics.GraphLines)
	fmt.Printf("  - Total files: %d\n", beforeMetrics.TotalFiles)

	fmt.Println("\n[2/5] Analyzing repository_after structure...")
	afterMetrics := analyzeStructure(repoAfter)
	fmt.Printf("  - Graph implementation: %v\n", afterMetrics.HasGraphImplementation)
	fmt.Printf("  - Graph lines: %d\n", afterMetrics.GraphLines)
	fmt.Printf("  - Total files: %d\n", afterMetrics.TotalFiles)

	// Run tests on before (should fail)
	fmt.Println("\n[3/5] Running tests on repository_before (expected to FAIL)...")
	beforeTestOutput := runTests(repoBefore, "repository_before", baseDir)

	// Load before results from JSON
	beforeResultsFile := filepath.Join(baseDir, "tests", "test_before_results.json")
	beforeResults := beforeTestOutput
	if data, err := os.ReadFile(beforeResultsFile); err == nil {
		var testSuite TestSuiteResult
		if err := json.Unmarshal(data, &testSuite); err == nil {
			beforeResults = TestResults{
				Success: testSuite.Success,
				Passed:  testSuite.Passed,
				Failed:  testSuite.Failed,
				Total:   testSuite.Total,
				Output:  beforeTestOutput.Output,
				Tests:   testSuite.Tests,
			}
		}
	}

	fmt.Printf("  ✗ Passed: %d\n", beforeResults.Passed)
	fmt.Printf("  ✗ Failed: %d\n", beforeResults.Failed)
	fmt.Printf("  ✗ Total: %d\n", beforeResults.Total)
	fmt.Printf("  ✗ Success: %v\n", beforeResults.Success)

	// Run tests on after (should pass)
	fmt.Println("\n[4/5] Running tests on repository_after (expected to PASS)...")
	afterTestOutput := runTests(repoAfter, "repository_after", baseDir)

	// Load after results from JSON
	afterResultsFile := filepath.Join(baseDir, "tests", "test_after_results.json")
	afterResults := afterTestOutput
	if data, err := os.ReadFile(afterResultsFile); err == nil {
		var testSuite TestSuiteResult
		if err := json.Unmarshal(data, &testSuite); err == nil {
			afterResults = TestResults{
				Success: testSuite.Success,
				Passed:  testSuite.Passed,
				Failed:  testSuite.Failed,
				Total:   testSuite.Total,
				Output:  afterTestOutput.Output,
				Tests:   testSuite.Tests,
			}
		}
	}

	fmt.Printf("  ✓ Passed: %d\n", afterResults.Passed)
	fmt.Printf("  ✓ Failed: %d\n", afterResults.Failed)
	fmt.Printf("  ✓ Total: %d\n", afterResults.Total)
	fmt.Printf("  ✓ Success: %v\n", afterResults.Success)

	// Generate report
	fmt.Println("\n[5/5] Generating report...")
	result := generateReport(beforeResults, afterResults, beforeMetrics, afterMetrics, baseDir)
	report := result["report"].(map[string]interface{})
	reportPath := result["report_path"].(string)

	// Print summary
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("Evaluation Complete")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("\nOverall Success: %v\n", report["success"])

	beforeData := report["before"].(map[string]interface{})
	beforeTests := beforeData["tests"].(map[string]interface{})
	fmt.Printf("\nBefore (Buggy Implementation):\n")
	fmt.Printf("  - Tests Passed: %v/%v\n", beforeTests["passed"], beforeTests["total"])
	fmt.Printf("  - Tests Failed: %v/%v\n", beforeTests["failed"], beforeTests["total"])
	beforeMetricsData := beforeMetrics
	fmt.Printf("  - Has Graph Implementation: %v\n", beforeMetricsData.HasGraphImplementation)

	afterData := report["after"].(map[string]interface{})
	afterTests := afterData["tests"].(map[string]interface{})
	fmt.Printf("\nAfter (Fixed Implementation):\n")
	fmt.Printf("  - Tests Passed: %v/%v\n", afterTests["passed"], afterTests["total"])
	fmt.Printf("  - Tests Failed: %v/%v\n", afterTests["failed"], afterTests["total"])
	afterMetricsData := afterMetrics
	fmt.Printf("  - Has Graph Implementation: %v\n", afterMetricsData.HasGraphImplementation)

	comparisonData := report["comparison"].(map[string]interface{})
	fmt.Printf("\nImprovements:\n")
	fmt.Printf("  - Tests fixed: %v\n", comparisonData["tests_fixed"])
	fmt.Printf("  - Tests improved: %v\n", comparisonData["tests_improved"])
	fmt.Printf("  - Structure improved: %v\n", comparisonData["structure_improved"])
	fmt.Printf("  - Graph implementation exists: %v\n", comparisonData["graph_implementation_exists"])

	fmt.Printf("\nReport saved to: %s\n", reportPath)

	success, _ := report["success"].(bool)
	if success {
		os.Exit(0)
	} else {
		os.Exit(1)
	}
}
