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
	Name     string `json:"name"`
	Status   string `json:"status"`
	Duration string `json:"duration,omitempty"`
}

type RequirementsChecklist struct {
	R1_ExactWorkerCount   bool `json:"r1_exact_worker_count"`
	R2_HeapPriorityQueue  bool `json:"r2_heap_priority_queue"`
	R3_ExponentialBackoff bool `json:"r3_exponential_backoff"`
	R4_TaskDeduplication  bool `json:"r4_task_deduplication"`
	R5_BufferedProgress   bool `json:"r5_buffered_progress"`
	R6_NoDeferInLoop      bool `json:"r6_no_defer_in_loop"`
	R7_NoUnusedImports    bool `json:"r7_no_unused_imports"`
	R8_PanicRecovery      bool `json:"r8_panic_recovery"`
	R9_GracefulShutdown   bool `json:"r9_graceful_shutdown"`
	R10_NoGoroutineLeak   bool `json:"r10_no_goroutine_leak"`
	R11_RateLimiting      bool `json:"r11_rate_limiting"`
	R12_RaceFreeStats     bool `json:"r12_race_free_stats"`
	R13_TaskTimeout       bool `json:"r13_task_timeout"`
	R14_QueueSizeLimit    bool `json:"r14_queue_size_limit"`
	R15_HardDeadline      bool `json:"r15_hard_deadline"`
	R16_PriorityOrdering  bool `json:"r16_priority_ordering"`
	R17_StandardLibOnly   bool `json:"r17_standard_lib_only"`
	R18_ConcurrentSafety  bool `json:"r18_concurrent_safety"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
}

type TestExecution struct {
	Success  bool         `json:"success"`
	ExitCode int          `json:"exit_code"`
	Tests    []TestResult `json:"tests"`
	Summary  TestSummary  `json:"summary"`
	Stdout   string       `json:"stdout"`
	Stderr   string       `json:"stderr"`
}

type Metrics struct {
	TotalFiles         bool `json:"total_files"`
	ExactWorkerCount   bool `json:"exact_worker_count"`
	HeapPriorityQueue  bool `json:"heap_priority_queue"`
	ExponentialBackoff bool `json:"exponential_backoff"`
	TaskDeduplication  bool `json:"task_deduplication"`
	BufferedProgress   bool `json:"buffered_progress"`
	NoDeferInLoop      bool `json:"no_defer_in_loop"`
	NoUnusedImports    bool `json:"no_unused_imports"`
	PanicRecovery      bool `json:"panic_recovery"`
	GracefulShutdown   bool `json:"graceful_shutdown"`
	NoGoroutineLeak    bool `json:"no_goroutine_leak"`
	RateLimiting       bool `json:"rate_limiting"`
	RaceFreeStats      bool `json:"race_free_stats"`
	TaskTimeout        bool `json:"task_timeout"`
	QueueSizeLimit     bool `json:"queue_size_limit"`
	HardDeadline       bool `json:"hard_deadline"`
	PriorityOrdering   bool `json:"priority_ordering"`
	StandardLibOnly    bool `json:"standard_lib_only"`
	ConcurrentSafety   bool `json:"concurrent_safety"`
}

type RepositoryState struct {
	Metrics Metrics       `json:"metrics"`
	Tests   TestExecution `json:"tests"`
}

type Environment struct {
	GoVersion    string `json:"go_version"`
	Platform     string `json:"platform"`
	OS           string `json:"os"`
	OSRelease    string `json:"os_release"`
	Architecture string `json:"architecture"`
	Hostname     string `json:"hostname"`
	GitCommit    string `json:"git_commit"`
	GitBranch    string `json:"git_branch"`
}

type EvaluationMetadata struct {
	EvaluationID string `json:"evaluation_id"`
	Timestamp    string `json:"timestamp"`
	Evaluator    string `json:"evaluator"`
	Project      string `json:"project"`
	Version      string `json:"version"`
}

type Comparison struct {
	AllRequirementsMet bool `json:"all_requirements_met"`
	TestsPassing       int  `json:"tests_passing"`
	TestImprovement    int  `json:"test_improvement"`
}

type FinalVerdict struct {
	Success           bool   `json:"success"`
	TotalTests        int    `json:"total_tests"`
	PassedTests       int    `json:"passed_tests"`
	FailedTests       int    `json:"failed_tests"`
	SuccessRate       string `json:"success_rate"`
	MeetsRequirements bool   `json:"meets_requirements"`
}

type Report struct {
	EvaluationMetadata    EvaluationMetadata    `json:"evaluation_metadata"`
	Environment           Environment           `json:"environment"`
	TestExecution         TestExecution         `json:"test_execution"`
	ComplianceCheck       RequirementsChecklist `json:"compliance_check"`
	Before                RepositoryState       `json:"before"`
	After                 RepositoryState       `json:"after"`
	Comparison            Comparison            `json:"comparison"`
	RequirementsChecklist RequirementsChecklist `json:"requirements_checklist"`
	FinalVerdict          FinalVerdict          `json:"final_verdict"`
}

const TOTAL = 18

func main() {
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║       🔬 TASK SCHEDULER EVALUATION 🔬                    ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Println()

	start := time.Now()

	dateStr := start.Format("2006-01-02")
	timeStr := start.Format("15-04-05")
	reportsDir := filepath.Join("reports", dateStr, timeStr)
	os.MkdirAll(reportsDir, 0755)

	hostname, _ := os.Hostname()
	goVersion := runtime.Version()
	osRelease := getOSRelease()

	report := Report{
		EvaluationMetadata: EvaluationMetadata{
			EvaluationID: generateEvaluationID(),
			Timestamp:    start.Format(time.RFC3339),
			Evaluator:    "automated_test_suite",
			Project:      "concurrent_task_scheduler",
			Version:      "1.0.0",
		},
		Environment: Environment{
			GoVersion:    goVersion,
			Platform:     runtime.GOOS,
			OS:           runtime.GOOS,
			OSRelease:    osRelease,
			Architecture: runtime.GOARCH,
			Hostname:     hostname,
			GitCommit:    "unknown",
			GitBranch:    "unknown",
		},
	}

	fmt.Println("🧪 Running tests with race detector...")
	testOutput, exitCode := runTests()
	testResults := parseTests(testOutput)

	passed := 0
	failed := 0
	for _, t := range testResults {
		if t.Status == "PASS" {
			passed++
		} else {
			failed++
		}
	}

	report.TestExecution = TestExecution{
		Success:  exitCode == 0,
		ExitCode: exitCode,
		Tests:    testResults,
		Summary: TestSummary{
			Total:   len(testResults),
			Passed:  passed,
			Failed:  failed,
			Errors:  0,
			Skipped: 0,
		},
		Stdout: testOutput,
		Stderr: "",
	}

	// Build compliance check from test results
	report.ComplianceCheck = RequirementsChecklist{
		R1_ExactWorkerCount:   isPassed(testResults, "Requirement1"),
		R2_HeapPriorityQueue:  isPassed(testResults, "Requirement2"),
		R3_ExponentialBackoff: isPassed(testResults, "Requirement3"),
		R4_TaskDeduplication:  isPassed(testResults, "Requirement4"),
		R5_BufferedProgress:   isPassed(testResults, "Requirement5"),
		R6_NoDeferInLoop:      isPassed(testResults, "Requirement6"),
		R7_NoUnusedImports:    isPassed(testResults, "Requirement7"),
		R8_PanicRecovery:      isPassed(testResults, "Requirement8"),
		R9_GracefulShutdown:   isPassed(testResults, "Requirement9"),
		R10_NoGoroutineLeak:   isPassed(testResults, "Requirement10"),
		R11_RateLimiting:      isPassed(testResults, "Requirement11"),
		R12_RaceFreeStats:     isPassed(testResults, "Requirement12"),
		R13_TaskTimeout:       isPassed(testResults, "Requirement13"),
		R14_QueueSizeLimit:    isPassed(testResults, "Requirement14"),
		R15_HardDeadline:      isPassed(testResults, "Requirement15"),
		R16_PriorityOrdering:  isPassed(testResults, "Requirement16"),
		R17_StandardLibOnly:   isPassed(testResults, "Requirement17"),
		R18_ConcurrentSafety:  isPassed(testResults, "Requirement18"),
	}

	report.Before = RepositoryState{
		Metrics: Metrics{},
		Tests: TestExecution{
			Success: false,
			Tests:   []TestResult{},
			Summary: TestSummary{},
		},
	}

	report.After = RepositoryState{
		Metrics: Metrics{
			TotalFiles:         true,
			ExactWorkerCount:   report.ComplianceCheck.R1_ExactWorkerCount,
			HeapPriorityQueue:  report.ComplianceCheck.R2_HeapPriorityQueue,
			ExponentialBackoff: report.ComplianceCheck.R3_ExponentialBackoff,
			TaskDeduplication:  report.ComplianceCheck.R4_TaskDeduplication,
			BufferedProgress:   report.ComplianceCheck.R5_BufferedProgress,
			NoDeferInLoop:      report.ComplianceCheck.R6_NoDeferInLoop,
			NoUnusedImports:    report.ComplianceCheck.R7_NoUnusedImports,
			PanicRecovery:      report.ComplianceCheck.R8_PanicRecovery,
			GracefulShutdown:   report.ComplianceCheck.R9_GracefulShutdown,
			NoGoroutineLeak:    report.ComplianceCheck.R10_NoGoroutineLeak,
			RateLimiting:       report.ComplianceCheck.R11_RateLimiting,
			RaceFreeStats:      report.ComplianceCheck.R12_RaceFreeStats,
			TaskTimeout:        report.ComplianceCheck.R13_TaskTimeout,
			QueueSizeLimit:     report.ComplianceCheck.R14_QueueSizeLimit,
			HardDeadline:       report.ComplianceCheck.R15_HardDeadline,
			PriorityOrdering:   report.ComplianceCheck.R16_PriorityOrdering,
			StandardLibOnly:    report.ComplianceCheck.R17_StandardLibOnly,
			ConcurrentSafety:   report.ComplianceCheck.R18_ConcurrentSafety,
		},
		Tests: report.TestExecution,
	}

	totalPassed := countPassed(report.ComplianceCheck)
	allMet := totalPassed == TOTAL

	report.Comparison = Comparison{
		AllRequirementsMet: allMet,
		TestsPassing:       passed,
		TestImprovement:    passed,
	}

	report.RequirementsChecklist = report.ComplianceCheck

	successRate := 0.0
	if len(testResults) > 0 {
		successRate = float64(passed) / float64(len(testResults)) * 100
	}

	report.FinalVerdict = FinalVerdict{
		Success:           allMet && exitCode == 0,
		TotalTests:        len(testResults),
		PassedTests:       passed,
		FailedTests:       failed,
		SuccessRate:       fmt.Sprintf("%.1f", successRate),
		MeetsRequirements: allMet,
	}

	reportFile := filepath.Join(reportsDir, "report.json")
	data, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(reportFile, data, 0644)

	printResults(report, reportFile, start, totalPassed)

	if !report.FinalVerdict.Success {
		os.Exit(1)
	}
}

func printResults(report Report, reportFile string, start time.Time, totalPassed int) {
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║                   🎯 RESULTS                             ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Printf("   📁 Report: %s\n", reportFile)
	fmt.Printf("   🕐 Duration: %v\n", time.Since(start).Round(time.Millisecond))
	fmt.Printf("   🖥️  Go: %s, OS: %s/%s\n", runtime.Version(), runtime.GOOS, runtime.GOARCH)
	fmt.Println()

	fmt.Println("┌──────────────────────────────────────────────────────────┐")
	fmt.Println("│              📋 REQUIREMENTS CHECKLIST                   │")
	fmt.Println("├──────────────────────────────────────────────────────────┤")
	printReq("1. Exact Worker Count (N goroutines)", report.ComplianceCheck.R1_ExactWorkerCount)
	printReq("2. Heap Priority Queue (container/heap)", report.ComplianceCheck.R2_HeapPriorityQueue)
	printReq("3. Exponential Backoff (1s, 2s, 4s)", report.ComplianceCheck.R3_ExponentialBackoff)
	printReq("4. Task Deduplication (same channel)", report.ComplianceCheck.R4_TaskDeduplication)
	printReq("5. Buffered Progress Channel (>=10)", report.ComplianceCheck.R5_BufferedProgress)
	printReq("6. No Defer in Loops", report.ComplianceCheck.R6_NoDeferInLoop)
	printReq("7. No Unused Imports (go vet clean)", report.ComplianceCheck.R7_NoUnusedImports)
	printReq("8. Panic Recovery (worker survives)", report.ComplianceCheck.R8_PanicRecovery)
	printReq("9. Graceful Shutdown (complete tasks)", report.ComplianceCheck.R9_GracefulShutdown)
	printReq("10. No Goroutine Leak (<=2 after)", report.ComplianceCheck.R10_NoGoroutineLeak)
	printReq("11. Rate Limiting (token bucket)", report.ComplianceCheck.R11_RateLimiting)
	printReq("12. Race-Free Stats (go test -race)", report.ComplianceCheck.R12_RaceFreeStats)
	printReq("13. Task Timeout (context cancel)", report.ComplianceCheck.R13_TaskTimeout)
	printReq("14. Queue Size Limit (block/error)", report.ComplianceCheck.R14_QueueSizeLimit)
	printReq("15. Hard Deadline Shutdown", report.ComplianceCheck.R15_HardDeadline)
	printReq("16. Priority Ordering (high first)", report.ComplianceCheck.R16_PriorityOrdering)
	printReq("17. Standard Library Only", report.ComplianceCheck.R17_StandardLibOnly)
	printReq("18. Concurrent Safety (all methods)", report.ComplianceCheck.R18_ConcurrentSafety)
	fmt.Println("└──────────────────────────────────────────────────────────┘")
	fmt.Println()

	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	if report.FinalVerdict.Success {
		fmt.Println("║            ✅ EVALUATION SUCCESS ✅                      ║")
	} else {
		fmt.Println("║            ❌ EVALUATION FAILED ❌                        ║")
	}
	fmt.Println("╠══════════════════════════════════════════════════════════╣")
	fmt.Printf("║   Requirements: %d/%d (%.0f%%)                              ║\n",
		totalPassed, TOTAL, float64(totalPassed)/float64(TOTAL)*100)
	fmt.Printf("║   Tests: %d/%d passed                                      ║\n",
		report.FinalVerdict.PassedTests, report.FinalVerdict.TotalTests)
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Println()
}

func generateEvaluationID() string {
	return fmt.Sprintf("eval_%d", time.Now().Unix())
}

func getOSRelease() string {
	content, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return "unknown"
	}
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "VERSION_ID=") {
			return strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
		}
	}
	return "unknown"
}

func runTests() (string, int) {
	cmd := exec.Command("go", "test", "-v", "-race", "-timeout", "120s", "./...")
	cmd.Dir = "/app/tests"
	output, err := cmd.CombinedOutput()
	fmt.Println(string(output))

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	return string(output), exitCode
}

func parseTests(output string) []TestResult {
	var results []TestResult
	re := regexp.MustCompile(`--- (PASS|FAIL): (\S+) \(([^)]+)\)`)
	matches := re.FindAllStringSubmatch(output, -1)
	for _, m := range matches {
		results = append(results, TestResult{
			Name:     m[2],
			Status:   m[1],
			Duration: m[3],
		})
	}
	return results
}

func isPassed(results []TestResult, contains string) bool {
	for _, r := range results {
		if strings.Contains(r.Name, contains) && r.Status == "PASS" {
			return true
		}
	}
	return false
}

func countPassed(r RequirementsChecklist) int {
	count := 0
	if r.R1_ExactWorkerCount {
		count++
	}
	if r.R2_HeapPriorityQueue {
		count++
	}
	if r.R3_ExponentialBackoff {
		count++
	}
	if r.R4_TaskDeduplication {
		count++
	}
	if r.R5_BufferedProgress {
		count++
	}
	if r.R6_NoDeferInLoop {
		count++
	}
	if r.R7_NoUnusedImports {
		count++
	}
	if r.R8_PanicRecovery {
		count++
	}
	if r.R9_GracefulShutdown {
		count++
	}
	if r.R10_NoGoroutineLeak {
		count++
	}
	if r.R11_RateLimiting {
		count++
	}
	if r.R12_RaceFreeStats {
		count++
	}
	if r.R13_TaskTimeout {
		count++
	}
	if r.R14_QueueSizeLimit {
		count++
	}
	if r.R15_HardDeadline {
		count++
	}
	if r.R16_PriorityOrdering {
		count++
	}
	if r.R17_StandardLibOnly {
		count++
	}
	if r.R18_ConcurrentSafety {
		count++
	}
	return count
}

func printReq(name string, passed bool) {
	status := "❌"
	if passed {
		status = "✅"
	}
	padded := name
	if len(padded) > 42 {
		padded = padded[:39] + "..."
	}
	fmt.Printf("│   %s %-42s   │\n", status, padded)
}