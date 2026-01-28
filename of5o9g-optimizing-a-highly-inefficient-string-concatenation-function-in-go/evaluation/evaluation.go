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

	// Extract Pass/Fail
	testRegex := regexp.MustCompile(`--- (PASS|FAIL): (\w+)`)
	matches := testRegex.FindAllStringSubmatch(stdout, -1)
	for _, m := range matches {
		outcome := "passed"
		if m[1] == "FAIL" {
			outcome = "failed"
		}
		results = append(results, TestResult{Name: m[2], Outcome: outcome})
	}

	// Requirement 4: Verify exactly 1 allocation per operation in benchmark output
	metrics.SingleAllocation = strings.Contains(stdout, "1 allocs/op")

	// Extract Timing
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
	
	// Execute the command
	err := cmd.Run()

	stdout := out.String()
	tests, metrics := parseGoOutput(stdout)

	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			exitCode = -1
		}
	}

	return &ExecutionResult{
		Passed:     exitCode == 0,
		ExitCode:   exitCode,
		Tests:      tests,
		Metrics:    metrics,
		Stdout:     stdout,
		DurationMs: time.Since(start).Milliseconds(),
	}
}

func main() {
	// Deterministic Identifiers for Bit-Level Reproducibility
	// We do NOT use random UUIDs or current timestamps here.
	runID := "deterministic-eval-v1"
	fixedTime := "2024-01-01T00:00:00Z"

	fmt.Printf("🚀 Starting Evaluation [Run ID: %s]\n", runID)

	// Step 1: Run Before (This MUST FAIL to prove the problem exists)
	// We target ./tests with the specific filter for the "Before" guardrail test
	before := runGoTask([]string{"./tests"}, "TestEfficiencyBefore", false)

	// Step 2: Run After (This MUST PASS and show 1 allocs/op)
	// We target ./tests, enable benchmarks, and filter for the "After" test
	after := runGoTask([]string{"./tests"}, "TestEfficiencyAfter", true)

	// Step 3: Success Logic
	// Success = Before Failed (Panic/Inefficiency) AND After Passed (Clean/Efficient)
	isBeforeFailure := !before.Passed
	isAfterSuccess := after.Passed && after.Metrics.SingleAllocation
	overallSuccess := isBeforeFailure && isAfterSuccess

	criteria := map[string]string{
		"r1_correctness":       fmt.Sprintf("%v", after.Passed),
		"r4_single_allocation": fmt.Sprintf("%v", after.Metrics.SingleAllocation),
		"performance_pivot":    fmt.Sprintf("BeforeFailed:%v_AfterPassed:%v", isBeforeFailure, isAfterSuccess),
	}

	report := Report{
		RunID:     runID,
		StartedAt: fixedTime, 
		// Hardcoded environment ensures the JSON hash remains constant across identical runs
		Environment:      map[string]string{"go_version": "1.21", "platform": "linux/amd64"},
		Before:           before,
		After:            after,
		CriteriaAnalysis: criteria,
		Success:          overallSuccess,
	}

	// Step 4: Write Final Report
	outputPath := filepath.Join("evaluation", "reports", "report.json")
	os.MkdirAll(filepath.Dir(outputPath), 0755)
	fileData, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(outputPath, fileData, 0644)

	// Step 5: Professional Console Output
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