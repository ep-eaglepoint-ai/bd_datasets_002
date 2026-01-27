package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Mapping for our Task Board project requirements
var reqs = []struct {
	id   string
	desc string
	test string
}{
	{"REQ-01", "User registration and login", "TestRegister_Success"},
	{"REQ-02", "Board creation success", "TestCreateBoard_Success"},
	{"REQ-03", "Default columns creation", "TestGetBoard_HasDefaultColumns"},
	{"REQ-04", "Task creation", "TestCreateTask_Success"},
	{"REQ-05", "Task deletion", "TestDeleteTask_Success"},
	{"REQ-06", "Task movement between columns", "TestMoveTask_Success"},
}

type TestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test"`
	Output  string    `json:"Output"`
}

type TestSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Skipped int `json:"skipped"`
}

type Report struct {
	RunID           string       `json:"run_id"`
	StartedAt       time.Time    `json:"started_at"`
	FinishedAt      time.Time    `json:"finished_at"`
	DurationSeconds float64      `json:"duration_seconds"`
	Success         bool         `json:"success"`
	Requirements    []ReqStatus  `json:"requirements"`
	Summary         TestSummary  `json:"summary"`
}

type ReqStatus struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Status      string `json:"status"` // PASS | FAIL
}

func runTests() (map[string]string, TestSummary, string) {
	cmd := exec.Command("go", "test", "-json", "-v", "./...")
	cmd.Dir = "/app/tests"
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	_ = cmd.Run()

	testOutcomes := make(map[string]string)
	summary := TestSummary{}
	
	scanner := bufio.NewScanner(&stdout)
	for scanner.Scan() {
		var ev TestEvent
		if err := json.Unmarshal(scanner.Bytes(), &ev); err != nil {
			continue
		}
		if ev.Test == "" {
			continue
		}
		if ev.Action == "pass" || ev.Action == "fail" || ev.Action == "skip" {
			testOutcomes[ev.Test] = ev.Action
			summary.Total++
			switch ev.Action {
			case "pass":
				summary.Passed++
			case "fail":
				summary.Failed++
			case "skip":
				summary.Skipped++
			}
		}
	}

	return testOutcomes, summary, stderr.String()
}

func main() {
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("REAL-TIME COLLABORATIVE TASK BOARD EVALUATION")
	fmt.Println(strings.Repeat("=", 60))

	startedAt := time.Now()
	testOutcomes, summary, errOutput := runTests()
	finishedAt := time.Now()

	satisfied := 0
	reqStatuses := []ReqStatus{}
	for _, r := range reqs {
		status := "FAIL"
		if outcome, ok := testOutcomes[r.test]; ok && outcome == "pass" {
			status = "PASS"
			satisfied++
		}
		reqStatuses = append(reqStatuses, ReqStatus{
			ID:          r.id,
			Description: r.desc,
			Status:      status,
		})
	}

	overallSuccess := satisfied == len(reqs) && summary.Failed == 0 && summary.Total > 0

	report := Report{
		RunID:           fmt.Sprintf("%d", startedAt.Unix()),
		StartedAt:       startedAt,
		FinishedAt:      finishedAt,
		DurationSeconds: finishedAt.Sub(startedAt).Seconds(),
		Success:         overallSuccess,
		Requirements:    reqStatuses,
		Summary:         summary,
	}

	// Output summary to terminal
	for _, rs := range reqStatuses {
		mark := "❌"
		if rs.Status == "PASS" {
			mark = "✅"
		}
		fmt.Printf("%s %s: %s\n", mark, rs.ID, rs.Description)
	}

	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Summary: %d total, %d passed, %d failed\n", summary.Total, summary.Passed, summary.Failed)
	fmt.Printf("Overall Success: %v\n", overallSuccess)
	fmt.Println(strings.Repeat("=", 60))

	if errOutput != "" {
		fmt.Println("Errors during execution:\n", errOutput)
	}

	// Save report
	data, _ := json.MarshalIndent(report, "", "  ")
	_ = os.WriteFile("report.json", data, 0644)
	fmt.Println("Report saved to report.json")

	if !overallSuccess {
		os.Exit(1)
	}
}
