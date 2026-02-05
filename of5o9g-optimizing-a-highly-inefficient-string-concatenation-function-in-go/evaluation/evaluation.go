package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"runtime"
)

// --- Structures for Canonical Report ---

type TestResult struct {
	Name    string `json:"name"`
	Outcome string `json:"outcome"`
}

type Metrics struct {
	SingleAllocation bool    `json:"single_allocation"`
	AvgTimeNs        float64 `json:"avg_time_ns_per_op"`
}

type ExecutionResult struct {
	Passed     bool         `json:"passed"`
	ExitCode   int          `json:"exit_code"`
	Tests      []TestResult `json:"tests"`
	Metrics    Metrics      `json:"metrics"`
	Stdout     string       `json:"stdout"`
	DurationMs int64        `json:"duration_ms"`
}

type Report struct {
	RunID            string            `json:"run_id"`
	StartedAt        string            `json:"started_at"`
	Environment      map[string]string `json:"environment"`
	Before           *ExecutionResult  `json:"before"`
	After            *ExecutionResult  `json:"after"`
	CriteriaAnalysis map[string]string `json:"criteria_analysis"`
	Success          bool              `json:"success"`
}

// --- Helper Functions ---

func parseGoOutput(stdout string) ([]TestResult, Metrics) {
	var results []TestResult
	metrics := Metrics{}

	// Extract Pass/Fail from verbose output
	testRegex := regexp.MustCompile(`--- (PASS|FAIL): (\w+)`)
	matches := testRegex.FindAllStringSubmatch(stdout, -1)
	for _, m := range matches {
		outcome := "passed"
		if m[1] == "FAIL" {
			outcome = "failed"
		}
		results = append(results, TestResult{Name: m[2], Outcome: outcome})
	}

	// Requirement 4: Verify exactly 1 allocation per operation
	metrics.SingleAllocation = strings.Contains(stdout, "1 allocs/op")

	// Extract Timing from benchmark output
	timeRegex := regexp.MustCompile(`(\d+\.?\d*)\s+ns/op`)
	timeMatch := timeRegex.FindStringSubmatch(stdout)
	if len(timeMatch) > 1 {
		fmt.Sscanf(timeMatch[1], "%f", &metrics.AvgTimeNs)
	}

	return results, metrics
}

func runGoTask(paths []string, runFilter string, benchmark bool) *ExecutionResult {
	start := time.Now()
	
	args := []string{"test", "-v"} 
	args = append(args, paths...)

	if runFilter != "" {
		args = append(args, "-run", runFilter)
	}

	if benchmark {
		args = append(args, "-bench=.", "-benchmem")
	}

	cmd := exec.Command("go", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	
	err := cmd.Run()

	stdout := out.String()
	tests, metrics := parseGoOutput(stdout)

	// Determine actual exit code
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			exitCode = -1
		}
	}

	// INTELLIGENT PASS DETECTION:
	// Since TestMain forces exit code 0, we must check if any tests actually failed in the logs.
	passed := (exitCode == 0)
	for _, t := range tests {
		if t.Outcome == "failed" {
			passed = false
			break
		}
	}
	
	// Fallback: If no tests were found but we expected them, and output has "FAIL", mark as failed.
	if len(tests) == 0 && strings.Contains(stdout, "FAIL") {
		passed = false
	}

	return &ExecutionResult{
		Passed:     passed,
		ExitCode:   exitCode,
		Tests:      tests,
		Metrics:    metrics,
		Stdout:     stdout,
		DurationMs: time.Since(start).Milliseconds(),
	}
}

func main() {
	runID := "deterministic-eval-v1"
	
	// This captures the "Baseline Failure"
	before := runGoTask([]string{"./tests"}, "TestEfficiencyBefore", false)

	// This captures the "Optimized Success"
	after := runGoTask([]string{"./tests"}, "TestEfficiencyAfter", true)

	// True Success = Before Failed (Bad Code) AND After Passed (Good Code)
	isBeforeFailure := !before.Passed
	isAfterSuccess := after.Passed && after.Metrics.SingleAllocation
	overallSuccess := isBeforeFailure && isAfterSuccess

	report := Report{
		RunID:       runID,
		StartedAt:   "2024-01-01T00:00:00Z", 
		Environment: map[string]string{"go": runtime.Version(), "arch": runtime.GOARCH},
		Before:      before,
		After:       after,
		CriteriaAnalysis: map[string]string{
			"baseline_invalid":  fmt.Sprintf("%v", isBeforeFailure),
			"optimized_valid":   fmt.Sprintf("%v", after.Passed),
			"memory_efficiency": fmt.Sprintf("%v", after.Metrics.SingleAllocation),
		},
		Success: overallSuccess,
	}

	// Step 4: Write Report
	outputPath := filepath.Join("evaluation", "reports", "report.json")
	os.MkdirAll(filepath.Dir(outputPath), 0755)
	fileData, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(outputPath, fileData, 0644)

	// Step 5: Clean Output
	fmt.Println("\n---------------------------------------------------")
	fmt.Println("📊 HEAD-TO-HEAD COMPARISON")
	fmt.Printf("BEFORE: Passed=%v (Expected: false)\n", before.Passed)
	fmt.Printf("AFTER:  Passed=%v | SingleAlloc=%v (Expected: true)\n", after.Passed, after.Metrics.SingleAllocation)
	fmt.Println("---------------------------------------------------")
	fmt.Printf("✅ Report saved to: %s\n", outputPath)

	if overallSuccess {
		fmt.Println("✅ SUCCESS: Optimization satisfies all requirements.")
		os.Exit(0)
	} else {
		fmt.Println("❌ FAILURE: Evaluation did not meet the expected performance delta.")
		os.Exit(1)
	}
}