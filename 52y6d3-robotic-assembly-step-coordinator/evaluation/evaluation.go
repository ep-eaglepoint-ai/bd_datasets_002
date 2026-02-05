package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
)

type TestResult struct {
	Requirement string `json:"requirement"`
	Status      string `json:"status"`
}

type EvalReport struct {
	TotalTests int          `json:"total_tests"`
	PassedTests int         `json:"passed_tests"`
	Results     []TestResult `json:"results"`
}

func main() {
	fmt.Println("Starting Evaluation...")

	// Run the tests
	cmd := exec.Command("go", "test", "-v", "./tests/...")
	output, err := cmd.CombinedOutput()

	status := "passed"
	passed := 8
	if err != nil {
		fmt.Printf("Tests failed: %v\n", err)
		fmt.Println(string(output))
		status = "failed"
		passed = 0
	}

	report := EvalReport{
		TotalTests:  8,
		PassedTests: passed,
		Results: []TestResult{
			{"1. Prerequisite Mapping", status},
			{"2. State Management Logic", status},
			{"3. Buffer & Release", status},
			{"4. Cascading Cancellation", status},
			{"5. Basic Validation & Safety", status},
			{"6. Concurrency Protection", status},
			{"7. Testing (Out of Order)", status},
			{"8. Testing (Failure Logic)", status},
		},
	}

	// Create directory if not exists
	os.MkdirAll("evaluation/reports", 0755)

	reportPath := "evaluation/reports/evaluation.report.json"
	file, _ := json.MarshalIndent(report, "", "  ")
	_ = os.WriteFile(reportPath, file, 0644)

	fmt.Printf("Evaluation complete. Report saved to %s\n", reportPath)
	if status == "failed" {
		os.Exit(1)
	}
}
