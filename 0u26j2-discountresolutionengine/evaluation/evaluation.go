package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TestEvent struct {
	Time    string  `json:"Time"`
	Action  string  `json:"Action"`
	Package string  `json:"Package"`
	Test    string  `json:"Test"`
	Output  string  `json:"Output"`
	Elapsed float64 `json:"Elapsed"`
}

type Report struct {
	Timestamp       string            `json:"timestamp"`
	RepositoryAfter RepositoryResults `json:"tests"`
	Success         bool              `json:"success"`
}

type RepositoryResults struct {
	Tests   map[string]string `json:"tests"`
	Metrics Metrics           `json:"metrics"`
}

type Metrics struct {
	Total  int `json:"total"`
	Passed int `json:"passed"`
	Failed int `json:"failed"`
}

func main() {
	fmt.Println(string(repeat('=', 60)))
	fmt.Println("Discount Resolution Engine - Evaluation")
	fmt.Println(string(repeat('=', 60)))

	results := make(map[string]string)
	passed := 0
	failed := 0

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Text()
		var event TestEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if event.Test != "" && (event.Action == "pass" || event.Action == "fail") {
			if event.Action == "pass" {
				results[event.Test] = "PASSED"
				passed++
			} else {
				results[event.Test] = "FAILED"
				failed++
			}
		}
	}

	total := passed + failed

	fmt.Printf("\n?? Evaluating tests...\n")
	fmt.Printf("   ? Passed: %d\n", passed)
	fmt.Printf("   ? Failed: %d\n", failed)

	report := Report{
		Timestamp: time.Now().Format(time.RFC3339),
		RepositoryAfter: RepositoryResults{
			Tests: results,
			Metrics: Metrics{
				Total:  total,
				Passed: passed,
				Failed: failed,
			},
		},
		Success: failed == 0 && total > 0,
	}

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15-04-05")

	projectRoot := os.Getenv("PROJECT_ROOT")
	if projectRoot == "" {
		cwd, _ := os.Getwd()
		projectRoot = filepath.Dir(cwd)
	}

	baseEvalDir := filepath.Join(projectRoot, "evaluation")
	os.MkdirAll(baseEvalDir, 0755)

	outputDir := filepath.Join(baseEvalDir, dateStr, timeStr)
	os.MkdirAll(outputDir, 0755)
	outputFile := filepath.Join(outputDir, "report.json")
	fixedOutputFile := filepath.Join(baseEvalDir, "report.json")

	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	os.WriteFile(outputFile, reportJSON, 0644)
	os.WriteFile(fixedOutputFile, reportJSON, 0644)

	fmt.Printf("\n%s\n", string(repeat('=', 60)))
	fmt.Println("EVALUATION SUMMARY")
	fmt.Println(string(repeat('=', 60)))
	fmt.Printf("Total Tests: %d\n", total)
	fmt.Printf("Passed: %d\n", passed)
	fmt.Printf("Failed: %d\n", failed)
	if total > 0 {
		fmt.Printf("Success Rate: %.1f%%\n", float64(passed)/float64(total)*100)
	}
	if report.Success {
		fmt.Println("Overall: ? PASS")
	} else {
		fmt.Println("Overall: ? FAIL")
	}
	fmt.Println(string(repeat('=', 60)))

	if !report.Success {
		os.Exit(1)
	}
}

func repeat(char rune, count int) []rune {
	result := make([]rune, count)
	for i := range result {
		result[i] = char
	}
	return result
}

