package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"math/rand"
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
	// Simple random ID
	rand.Seed(time.Now().UnixNano())
	runID := fmt.Sprintf("%08x", rand.Int63())[:8]
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
	
	// Define paths based on Docker mounts
	// We expect source code to be mounted at /app/mnt
	// We copy to /app to run tests
	
	workDir := "/app"
	mntDir := "/app/mnt"
	
	// Check if running in Docker with mounts
	if _, err := os.Stat(mntDir); os.IsNotExist(err) {
		// Fallback for local testing (dangerous if not careful)
		fmt.Println("Warning: /app/mnt not found. Assuming local execution.")
		workDir, _ = os.Getwd()
		mntDir = workDir // Use same dir
	}

	// Helper to setup workspace
	setupWorkspace := func(sourceRepo string) error {
		// Clean workspace
		// We only clean repository_after because that's what tests import
		targetRepo := filepath.Join(workDir, "repository_after")
		os.RemoveAll(targetRepo)
		
		// Copy requested source to repository_after name
		src := filepath.Join(mntDir, sourceRepo)
		if err := copyDir(src, targetRepo); err != nil {
			return err
		}
		
		// Copy tests and go.mod if not present (or update them)
		// We always overwrite tests/go.mod from mount to ensure they match
		copyDir(filepath.Join(mntDir, "tests"), filepath.Join(workDir, "tests"))
		copyDir(filepath.Join(mntDir, "go.mod"), filepath.Join(workDir, "go.mod"))
		
		return nil
	}

	// 1. Test BEFORE
	fmt.Println("Setting up repository_before...")
	if err := setupWorkspace("repository_before"); err != nil {
		fmt.Printf("Error setting up before workspace: %v\n", err)
		// Don't exit, record failure
	} else {
		fmt.Println("Running tests against repository_before code...")
		results["before"] = runGoTest()
	}

	// 2. Test AFTER
	fmt.Println("Setting up repository_after...")
	if err := setupWorkspace("repository_after"); err != nil {
		fmt.Printf("Error setting up after workspace: %v\n", err)
	} else {
		fmt.Println("Running tests against repository_after code...")
		results["after"] = runGoTest()
	}

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
		// If in docker
		baseDir := "/app/evaluation"
		if _, err := os.Stat("/app"); os.IsNotExist(err) {
            // Local fallback
			wd, _ := os.Getwd()
			if _, err := os.Stat("go.mod"); os.IsNotExist(err) {
                // assume child dir
				baseDir = filepath.Join(filepath.Dir(wd), "evaluation")
            } else {
                baseDir = filepath.Join(wd, "evaluation")
            }
		}
		
		outputPath = filepath.Join(baseDir, 
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