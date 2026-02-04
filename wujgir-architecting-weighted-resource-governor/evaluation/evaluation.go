package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/google/uuid"
	"flag"
)

// Report structure matching the Python script's output
type Report struct {
	RunID           string                 `json:"run_id"`
	StartedAt       string                 `json:"started_at"`
	FinishedAt      string                 `json:"finished_at"`
	DurationSeconds float64                `json:"duration_seconds"`
	Success         bool                   `json:"success"`
	Error           *string                `json:"error"` // Nullable
	Environment     map[string]string      `json:"environment"`
	Results         map[string]TestResult  `json:"results"`
}

type TestResult struct {
	Success  bool        `json:"success"`
	ExitCode int         `json:"exit_code"`
	Tests    []TestCase  `json:"tests"`
	Summary  TestSummary `json:"summary"`
	Stdout   string      `json:"stdout"`
	Stderr   string      `json:"stderr"`
}

type TestCase struct {
	NodeID  string `json:"nodeid"`
	Name    string `json:"name"`
	Outcome string `json:"outcome"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Errors  int `json:"errors"`
	Skipped int `json:"skipped"`
	Error   string `json:"error,omitempty"`
}

// GoTestEvent represents JSON output from 'go test -json'
type GoTestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test,omitempty"`
	Elapsed float64   `json:"Elapsed,omitempty"`
	Output  string    `json:"Output,omitempty"`
}

func main() {
	runID := uuid.New().String()[:8]
	startedAt := time.Now()
	
	fmt.Printf("Run ID: %s\n", runID)
	fmt.Printf("Started at: %s\n", startedAt.Format(time.RFC3339))

	// Collect Environment
	envInfo := map[string]string{
		"go_version": runtime.Version(),
		"os":         runtime.GOOS,
		"arch":       runtime.GOARCH,
		"git_commit": getGitCommit(),
		"git_branch": getGitBranch(),
	}

	results := make(map[string]TestResult)
	
	// Define tests to run
	// Note: We run the SAME tests (tests/) against BEFORE and AFTER.
	// But in Docker, we mount the code.
	// Locally, we might not be able to swap easily without mounting.
	// This script assumes it is running in an environment where strict 'before' vs 'after' 
	// might normally require swapping, OR we just run specific targets if they existed.
	// But per task, we have "repository_before" and "repository_after" folders.
	// The tests import "github.com/eaglepoint/dwrg/repository_after".
	// So running tests normally ALWAYS tests "after".
	// 
	// To test "before", we rely on the Docker container 'test-before' which mounts 'repository_before' 
	// to the path 'repository_after' (effectively mocking it).
	// 
	// Wait, the 'evaluation' service in docker-compose is supposed to run BOTH?
	// The prompt said: "docker compose run --rm evaluation (this will run the python [now go] script ...)"
	// Implementation Plan says: "Executes `go test` against `repository_before` and `repository_after`."
	//
	// How can one script run both if it relies on volume mounts setup at container launch?
	// If the container is started with one mount, it can't switch.
	// 
	// CRITICAL REALIZATION:
	// The 'evaluation' container cannot easily swap mounts mid-execution.
	// UNLESS the 'evaluation' script creates *sub-containers* (Docker-in-Docker) or
	// uses separate logical steps/paths if possible.
	// 
	// Or, maybe the 'evaluation' script is just a coordinator that Calls the other docker services?
	// But it says "run the python script ... report.json matches".
	// 
	// Maybe we copy files?
	// If we are inside the container, we can copy 'repository_before' content onto 'repository_after' content?
	// Yes, that works!
	// 
	// Strategy for 'evaluation' script inside the container:
	// 1. Run tests (Current state = `repository_after` likely, or whatever is default).
	// 2. Backup `repository_after`.
	// 3. Copy `repository_before` to `repository_after`.
	// 4. Run tests again.
	// 5. Restore backup.
	//
	// Wait, `repository_before` is empty of Go files.
	// So simply copying it will define an empty package.
	// Build will fail.
	// This is "success" for the "before" check (Failed build/tests).
	
	// Let's implement this copy-swap logic.
	
	projectRoot, _ := os.Getwd() // Assuming run from project root
	// If run from evaluation/, adjust.
	// We'll require running from root or finding root.
	if _, err := os.Stat("go.mod"); os.IsNotExist(err) {
		// try parent
		os.Chdir("..")
		projectRoot, _ = os.Getwd()
	}

	// 1. Test BEFORE (Copy before -> after)
	// Actually, usually we test "After" logic first to ensure it matches requirement?
	// Doesn't matter.
	
	// BACKUP repository_after
	backupDir := filepath.Join(projectRoot, "repository_after_backup")
	implDir := filepath.Join(projectRoot, "repository_after")
	beforeDir := filepath.Join(projectRoot, "repository_before")

	// Helper to copy dir
	copyDir(implDir, backupDir)
	
	// OVERWRITE with BEFORE
	// Remove contents of implDir
	os.RemoveAll(implDir)
	os.MkdirAll(implDir, 0755)
	
	// Copy Before -> Impl
	copyDir(beforeDir, implDir)
	
	fmt.Println("Running tests against repository_before code...")
	results["before"] = runGoTest()
	
	// RESTORE AFTER
	os.RemoveAll(implDir)
	copyDir(backupDir, implDir)
	os.RemoveAll(backupDir) // Clean backup
	
	fmt.Println("Running tests against repository_after code...")
	results["after"] = runGoTest()

	finishedAt := time.Now()
	duration := finishedAt.Sub(startedAt).Seconds()

	// Logic: Success if After passed and Before failed (or failed build).
	// Before is expected to fail.
	beforePassed := results["before"].Success
	afterPassed := results["after"].Success
	
	overallSuccess := !beforePassed && afterPassed
	
	var errStr *string
	if !overallSuccess {
		s := "Verification failed: "
		if beforePassed {
			s += "Before implementation unexpectedly passed. "
		}
		if !afterPassed {
			s += "After implementation failed. "
		}
		errStr = &s
	}

	report := Report{
		RunID:           runID,
		StartedAt:       startedAt.Format(time.RFC3339),
		FinishedAt:      finishedAt.Format(time.RFC3339),
		DurationSeconds: duration,
		Success:         overallSuccess,
		Error:           errStr,
		Environment:     envInfo,
		Results:         results,
	}
	
	// Output JSON
	var outputPath string
	flag.StringVar(&outputPath, "output", "", "Output JSON file path")
	flag.Parse()

	if outputPath == "" {
		outputPath = filepath.Join(projectRoot, "evaluation", 
			fmt.Sprintf("%s", time.Now().Format("2006-01-02")), 
			fmt.Sprintf("%s", time.Now().Format("15-04-05")), 
			"report.json")
	}
		
	os.MkdirAll(filepath.Dir(outputPath), 0755)
	
	file, _ := os.Create(outputPath)
	defer file.Close()
	
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	encoder.Encode(report)
	
	fmt.Printf("\nReport saved to: %s\n", outputPath)
	if overallSuccess {
		fmt.Println("EVALUATION SUCCESS")
		os.Exit(0)
	} else {
		fmt.Println("EVALUATION FAILED")
		os.Exit(1)
	}
}

func runGoTest() TestResult {
	// Run go test -json ./tests/...
	cmd := exec.Command("go", "test", "-json", "./tests/...")
	output, err := cmd.Output()
	
	// If err != nil, likely build failed or tests failed.
	// But -json should still output (unless build error).
	// If build error, output might be non-JSON text in stderr.
	
	result := TestResult{
		Success: err == nil,
		ExitCode: 0,
	}
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Stderr = string(exitErr.Stderr)
		} else {
			result.ExitCode = 1
		}
	}
	
	// Parse JSON output
	var tests []TestCase
	passed, failed, skipped := 0, 0, 0
	
	// Sometimes build failures are not JSON.
	// We scan line by line.
	// Use Decoder
	
	// If output is empty, maybe build failed completely?
	if len(output) > 0 {
		// It's a stream of JSON objects
		// We'll wrap it in a bytes buffer
		// ... simpler: simple split
		// But valid JSON parsing is safer.
	}
	
	// Simple parsing
	lines := splitLines(string(output))
	for _, line := range lines {
		if line == "" { continue }
		var event GoTestEvent
		if jsonErr := json.Unmarshal([]byte(line), &event); jsonErr == nil {
			if event.Test != "" && event.Output == "" { // Likely start/end of test
				// Wait, -json emits multiple events per test.
				// Actions: run, pass, fail, skip.
				if event.Action == "pass" || event.Action == "fail" || event.Action == "skip" {
					if event.Test != "" {
						testCase := TestCase{
							NodeID:  event.Test,
							Name:    event.Test,
							Outcome: mapActionToOutcome(event.Action),
						}
						tests = append(tests, testCase)
						if event.Action == "pass" { passed++ }
						if event.Action == "fail" { failed++ }
						if event.Action == "skip" { skipped++ }
					}
				}
			}
		} else {
			// Not JSON? Maybe build error text mixed in?
			result.Stdout += line + "\n"
		}
	}
	
	result.Tests = tests
	result.Summary = TestSummary{
		Total:   passed + failed + skipped,
		Passed:  passed,
		Failed:  failed,
		Skipped: skipped,
	}
	
	// If we had a build error, success is definitely false
	if result.ExitCode != 0 && result.Summary.Total == 0 {
		result.Summary.Error = "Build failed or no tests run: " + result.Stderr
		result.Success = false
	}
	
	return result
}

func mapActionToOutcome(action string) string {
	switch action {
	case "pass": return "passed"
	case "fail": return "failed"
	case "skip": return "skipped"
	default: return action
	}
}

func copyDir(src, dst string) error {
	// Simple recursive copy
	return exec.Command("cp", "-r", src, dst).Run()
}

func getGitCommit() string {
	out, _ := exec.Command("git", "rev-parse", "HEAD").Output()
	if len(out) > 8 { return string(out[:8]) }
	return "unknown"
}

func getGitBranch() string {
	out, _ := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD").Output()
	return string(out) // trim newline needed
}

func splitLines(s string) []string {
	var lines []string
	var cur string
	for _, c := range s {
		if c == '\n' {
			lines = append(lines, cur)
			cur = ""
		} else {
			cur += string(c)
		}
	}
	if cur != "" { lines = append(lines, cur) }
	return lines
}
