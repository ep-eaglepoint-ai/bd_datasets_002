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
	Name            string  `json:"name"`
	Status          string  `json:"status"`
	DurationSeconds float64 `json:"duration_seconds"`
	Output          string  `json:"output"`
}

type Metrics struct {
	EvaluationTime string                 `json:"evaluation_time"`
	InstanceID     string                 `json:"instance_id"`
	OverallStatus  string                 `json:"overall_status"`
	StructureCheck map[string]bool        `json:"structure_check"`
	GoTests        map[string]interface{} `json:"go_tests"`
	MetaTests      map[string]interface{} `json:"go_meta_tests"`
	Summary        struct {
		TotalTests           int     `json:"total_tests"`
		Passed               int     `json:"passed"`
		Failed               int     `json:"failed"`
		TotalDurationSeconds float64 `json:"total_duration_seconds"`
	} `json:"summary"`
	ErrorLogs []string `json:"error_logs"`
}

func runGoTests(repoDir string) map[string]interface{} {
	result := map[string]interface{}{
		"framework":        "go_test",
		"directory":        repoDir,
		"start_time":       time.Now().Format(time.RFC3339),
		"test_results":     []TestResult{},
		"overall_status":   "error",
		"passed":           0,
		"failed":           0,
		"total_tests":      0,
		"duration_seconds": 0.0,
	}

	if _, err := os.Stat(filepath.Join(repoDir, "go.mod")); os.IsNotExist(err) {
		result["error"] = fmt.Sprintf("No go.mod found in %s", repoDir)
		return result
	}

	startTime := time.Now()
	cmd := exec.Command("go", "test", "-v", "-race", "-json", "./...")
	cmd.Dir = repoDir
	output, err := cmd.CombinedOutput()

	testDetails := make(map[string]*TestResult)
	dec := json.NewDecoder(strings.NewReader(string(output)))
	for dec.More() {
		var entry struct {
			Test    string  `json:"Test"`
			Action  string  `json:"Action"`
			Elapsed float64 `json:"Elapsed"`
			Output  string  `json:"Output"`
		}
		if err := dec.Decode(&entry); err != nil {
			continue
		}
		if entry.Test != "" {
			if _, ok := testDetails[entry.Test]; !ok {
				testDetails[entry.Test] = &TestResult{Name: entry.Test, Status: "running"}
			}
			tr := testDetails[entry.Test]
			switch entry.Action {
			case "pass":
				tr.Status = "passed"
				tr.DurationSeconds = entry.Elapsed
			case "fail":
				tr.Status = "failed"
				tr.DurationSeconds = entry.Elapsed
			case "output":
				tr.Output += entry.Output
			}
		}
	}

	var testResults []TestResult
	passed, failed := 0, 0
	for _, tr := range testDetails {
		testResults = append(testResults, *tr)
		if tr.Status == "passed" {
			passed++
		} else if tr.Status == "failed" {
			failed++
		}
	}

	result["test_results"] = testResults
	result["passed"] = passed
	result["failed"] = failed
	result["total_tests"] = len(testDetails)
	result["duration_seconds"] = time.Since(startTime).Seconds()
	result["end_time"] = time.Now().Format(time.RFC3339)
	if err == nil {
		result["overall_status"] = "passed"
	} else {
		result["overall_status"] = "failed"
		result["error"] = err.Error()
	}
	return result
}

func main() {
	projectRoot, _ := os.Getwd()
	repoAfter := filepath.Join(projectRoot, "repository_after")

	metrics := Metrics{
		EvaluationTime: time.Now().Format(time.RFC3339),
		InstanceID:     "Y67YP7",
		OverallStatus:  "pending",
	}

	metrics.StructureCheck = map[string]bool{
		"has_event_model":     fileExists(filepath.Join(repoAfter, "event.go")),
		"has_store_interface": fileExists(filepath.Join(repoAfter, "store.go")),
		"has_memory_store":    fileExists(filepath.Join(repoAfter, "memory_store.go")),
		"has_orchestrator":    fileExists(filepath.Join(repoAfter, "orchestrator.go")),
		"has_retry_policy":    fileExists(filepath.Join(repoAfter, "retry.go")),
		"has_tests":           fileExists(filepath.Join(repoAfter, "dispatcher_test.go")),
		"has_go_mod":          fileExists(filepath.Join(repoAfter, "go.mod")),
	}

	structComplete := true
	for _, v := range metrics.StructureCheck {
		if !v {
			structComplete = false
			break
		}
	}
	metrics.StructureCheck["structure_complete"] = structComplete

	metrics.GoTests = runGoTests(repoAfter)

	// Running meta-tests (which we'll place in tests/)
	// Since we are running outside a module for the meta-tests, we run them as a package
	metaStartTime := time.Now()
	metaCmd := exec.Command("go", "test", "-v", "-json", "./tests/...")
	metaCmd.Dir = projectRoot
	metaOutput, metaErr := metaCmd.CombinedOutput()

	metaDetails := make(map[string]*TestResult)
	metaDec := json.NewDecoder(strings.NewReader(string(metaOutput)))
	for metaDec.More() {
		var entry struct {
			Test    string  `json:"Test"`
			Action  string  `json:"Action"`
			Elapsed float64 `json:"Elapsed"`
			Output  string  `json:"Output"`
		}
		if err := metaDec.Decode(&entry); err != nil {
			continue
		}
		if entry.Test != "" {
			if _, ok := metaDetails[entry.Test]; !ok {
				metaDetails[entry.Test] = &TestResult{Name: entry.Test, Status: "running"}
			}
			tr := metaDetails[entry.Test]
			switch entry.Action {
			case "pass":
				tr.Status = "passed"
				tr.DurationSeconds = entry.Elapsed
			case "fail":
				tr.Status = "failed"
				tr.DurationSeconds = entry.Elapsed
			}
		}
	}

	var metaResults []TestResult
	metaPassed, metaFailed := 0, 0
	for _, tr := range metaDetails {
		metaResults = append(metaResults, *tr)
		if tr.Status == "passed" {
			metaPassed++
		} else if tr.Status == "failed" {
			metaFailed++
		}
	}

	metrics.MetaTests = map[string]interface{}{
		"framework":      "go_test_meta",
		"passed":         metaPassed,
		"failed":         metaFailed,
		"total_tests":    len(metaDetails),
		"overall_status": "failed",
	}
	if metaErr == nil {
		metrics.MetaTests["overall_status"] = "passed"
	}
	metrics.MetaTests["duration_seconds"] = time.Since(metaStartTime).Seconds()

	metrics.Summary.TotalTests = metrics.GoTests["total_tests"].(int) + len(metaDetails)
	metrics.Summary.Passed = metrics.GoTests["passed"].(int) + metaPassed
	metrics.Summary.Failed = metrics.GoTests["failed"].(int) + metaFailed
	metrics.Summary.TotalDurationSeconds = metrics.GoTests["duration_seconds"].(float64) + metrics.MetaTests["duration_seconds"].(float64)

	if structComplete && metrics.GoTests["overall_status"] == "passed" && metrics.MetaTests["overall_status"] == "passed" {
		metrics.OverallStatus = "passed"
	} else {
		metrics.OverallStatus = "failed"
	}

	reportFile := filepath.Join(projectRoot, "evaluation", "report.json")
	os.Remove(reportFile) // Ensure it's removed if it exists

	data, _ := json.MarshalIndent(metrics, "", "  ")
	fmt.Println("[REPORT_JSON_START]")
	fmt.Println(string(data))
	fmt.Println("[REPORT_JSON_END]")

	// Final exit code based on status
	if metrics.OverallStatus != "passed" {
		os.Exit(1)
	}
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
