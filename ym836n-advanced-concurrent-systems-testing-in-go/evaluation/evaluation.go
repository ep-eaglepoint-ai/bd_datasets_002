package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type TestResult struct {
	Passed  int
	Failed  int
	Skipped int
	Total   int
	Output  string
}

func main() {
	fmt.Println("=" + strings.Repeat("=", 70))
	fmt.Println("YM836N - Advanced Concurrent Systems Testing Evaluation")
	fmt.Println("=" + strings.Repeat("=", 70))
	fmt.Println()

	// Get workspace root
	workspaceRoot, err := os.Getwd()
	if err != nil {
		fmt.Printf("Error getting working directory: %v\n", err)
		os.Exit(1)
	}

	// Test repository_before
	fmt.Println("TESTING REPOSITORY_BEFORE")
	fmt.Println("-" + strings.Repeat("-", 70))
	beforeResult := runTests(filepath.Join(workspaceRoot, "repository_before"))
	printTestResult(beforeResult)
	fmt.Println()

	// Test repository_after
	fmt.Println("TESTING REPOSITORY_AFTER")
	fmt.Println("-" + strings.Repeat("-", 70))
	afterResult := runTests(filepath.Join(workspaceRoot, "repository_after"))
	printTestResult(afterResult)
	fmt.Println()

	// Run meta tests
	fmt.Println("RUNNING META VALIDATION TESTS")
	fmt.Println("-" + strings.Repeat("-", 70))
	metaResult := runMetaTests(workspaceRoot)
	printTestResult(metaResult)
	fmt.Println()

	// Summary
	fmt.Println("EVALUATION SUMMARY")
	fmt.Println("=" + strings.Repeat("=", 70))
	fmt.Printf("Repository Before: %d/%d passed\n", beforeResult.Passed, beforeResult.Total)
	fmt.Printf("Repository After:  %d/%d passed\n", afterResult.Passed, afterResult.Total)
	fmt.Printf("Meta Validation:   %d/%d passed\n", metaResult.Passed, metaResult.Total)
	fmt.Println()

	// Show compatibility analysis
	if beforeResult.Total > 0 && afterResult.Total > 0 {
		if beforeResult.Passed == afterResult.Passed && beforeResult.Total == afterResult.Total {
			// Pass-pass strategy: both versions pass all tests
			fmt.Println("✓ Backward Compatibility: 100% - Both versions pass all tests")
		} else {
			// Show improvement/regression
			improvement := float64(afterResult.Passed-beforeResult.Passed) / float64(afterResult.Total) * 100
			if improvement > 0 {
				fmt.Printf("Improvement: +%.1f%% more tests passing in after vs before\n", improvement)
			} else if improvement < 0 {
				fmt.Printf("Regression: %.1f%% fewer tests passing in after vs before\n", improvement)
			} else {
				fmt.Println("Change: Same pass rate, but different test coverage")
			}
		}
	}
	fmt.Println()

	// Save JSON report
	saveJSONReport(workspaceRoot, beforeResult, afterResult, metaResult)

	// Determine overall status
	if afterResult.Failed == 0 && metaResult.Failed == 0 {
		fmt.Println("✓ EVALUATION PASSED - All tests successful!")
		os.Exit(0)
	} else {
		fmt.Println("✗ EVALUATION FAILED - Some tests did not pass")
		os.Exit(1)
	}
}

func runTests(targetPath string) TestResult {
	result := TestResult{}

	// Both before and after use tests/unit, but with different replace directives
	workspaceRoot := filepath.Dir(targetPath)
	testDir := filepath.Join(workspaceRoot, "tests", "unit")

	if !pathExists(testDir) {
		result.Output = fmt.Sprintf("Test directory does not exist: %s", testDir)
		return result
	}

	// For repository_before, temporarily modify go.mod
	goModPath := filepath.Join(testDir, "go.mod")
	isBeforeRepo := strings.Contains(targetPath, "repository_before")

	var originalContent []byte
	var err error

	if isBeforeRepo {
		// Read original go.mod
		originalContent, err = os.ReadFile(goModPath)
		if err != nil {
			result.Output = fmt.Sprintf("Failed to read go.mod: %v", err)
			return result
		}

		// Replace repository_after with repository_before
		modifiedContent := strings.ReplaceAll(string(originalContent), "repository_after", "repository_before")
		err = os.WriteFile(goModPath, []byte(modifiedContent), 0644)
		if err != nil {
			result.Output = fmt.Sprintf("Failed to modify go.mod: %v", err)
			return result
		}

		// Restore go.mod after test
		defer os.WriteFile(goModPath, originalContent, 0644)
	}

	// Run go test from test directory
	cmd := exec.Command("go", "test", "-v", "./...")
	cmd.Dir = testDir
	cmd.Env = append(os.Environ(),
		"GO111MODULE=on",
		"CGO_ENABLED=0",
	)

	output, err := cmd.CombinedOutput()
	result.Output = string(output)

	// Parse test results
	lines := strings.Split(result.Output, "\n")
	for _, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), "--- PASS:") {
			result.Passed++
			result.Total++
		} else if strings.HasPrefix(strings.TrimSpace(line), "--- FAIL:") {
			result.Failed++
			result.Total++
		} else if strings.Contains(line, "SKIP:") {
			result.Skipped++
			result.Total++
		}
	}

	// Alternative parsing if above doesn't work
	if result.Total == 0 {
		if strings.Contains(result.Output, "PASS") && err == nil {
			result.Passed = 1
			result.Total = 1
		} else if strings.Contains(result.Output, "FAIL") || err != nil {
			result.Failed = 1
			result.Total = 1
		}
	}

	return result
}

// runMetaTests runs meta validation tests from tests directory
func runMetaTests(workspaceRoot string) TestResult {
	result := TestResult{}

	testsDir := filepath.Join(workspaceRoot, "tests")

	if !pathExists(testsDir) {
		result.Output = "Tests directory not found"
		return result
	}

	cmd := exec.Command("go", "test", "-v", "-run", "^TestMeta")
	cmd.Dir = testsDir
	cmd.Env = append(os.Environ(),
		"GO111MODULE=on",
		"CGO_ENABLED=0",
	)

	output, err := cmd.CombinedOutput()
	result.Output = string(output)

	lines := strings.Split(result.Output, "\n")
	for _, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), "--- PASS:") {
			result.Passed++
			result.Total++
		} else if strings.HasPrefix(strings.TrimSpace(line), "--- FAIL:") {
			result.Failed++
			result.Total++
		} else if strings.HasPrefix(strings.TrimSpace(line), "--- SKIP:") {
			result.Skipped++
			result.Total++
		}
	}

	if result.Total == 0 {
		if strings.Contains(result.Output, "PASS") && err == nil {
			result.Passed = 1
			result.Total = 1
		} else if strings.Contains(result.Output, "FAIL") || err != nil {
			result.Failed = 1
			result.Total = 1
		}
	}

	return result
}

func printTestResult(result TestResult) {
	fmt.Printf("Tests Run:     %d\n", result.Total)
	fmt.Printf("Passed:        %d\n", result.Passed)
	fmt.Printf("Failed:        %d\n", result.Failed)
	fmt.Printf("Skipped:       %d\n", result.Skipped)

	if result.Failed > 0 {
		fmt.Println("\nTest Output:")
		fmt.Println(strings.Repeat("-", 70))
		fmt.Println(result.Output)
		fmt.Println(strings.Repeat("-", 70))
	}
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func saveJSONReport(workspaceRoot string, beforeResult, afterResult, metaResult TestResult) {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	reportDir := filepath.Join(workspaceRoot, "evaluation", "report")

	err := os.MkdirAll(reportDir, 0755)
	if err != nil {
		fmt.Printf("Warning: Could not create report directory: %v\n", err)
		return
	}

	reportFilename := fmt.Sprintf("evaluation_%s.json", timestamp)
	reportPath := filepath.Join(reportDir, reportFilename)

	report := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"repository_before": map[string]interface{}{
			"passed":  beforeResult.Passed,
			"failed":  beforeResult.Failed,
			"skipped": beforeResult.Skipped,
			"total":   beforeResult.Total,
		},
		"repository_after": map[string]interface{}{
			"passed":  afterResult.Passed,
			"failed":  afterResult.Failed,
			"skipped": afterResult.Skipped,
			"total":   afterResult.Total,
		},
		"meta_validation": map[string]interface{}{
			"passed":  metaResult.Passed,
			"failed":  metaResult.Failed,
			"skipped": metaResult.Skipped,
			"total":   metaResult.Total,
		},
		"status": func() string {
			if afterResult.Failed == 0 && metaResult.Failed == 0 {
				return "PASSED"
			}
			return "FAILED"
		}(),
	}

	jsonData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Printf("Warning: Could not marshal JSON report: %v\n", err)
		return
	}

	err = os.WriteFile(reportPath, jsonData, 0644)
	if err != nil {
		fmt.Printf("Warning: Could not write report file: %v\n", err)
		return
	}

	fmt.Printf("\nReport saved to: %s\n", reportPath)
}
