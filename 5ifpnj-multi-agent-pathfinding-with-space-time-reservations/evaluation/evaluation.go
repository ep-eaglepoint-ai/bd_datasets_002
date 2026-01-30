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

var reqs = []struct {
	id   string
	desc string
	test string
}{
	{"REQ-01", "Vertex conflict prevention", "TestVertexConflict"},
	{"REQ-02", "Edge conflict (swapping) detection", "TestEdgeConflict"},
	{"REQ-03", "Wait action support", "TestWaitAction"},
	{"REQ-04", "Obstacle avoidance", "TestObstacleAvoidance"},
	{"REQ-05", "Multiple robots coordination", "TestMultipleRobots"},
	{"REQ-06", "Thread-safe reservation table", "TestReservationTableThreadSafety"},
	{"REQ-07", "Manhattan distance heuristic", "TestManhattanDistance"},
	{"REQ-08", "Space-time tracking", "TestSpaceTimeTracking"},
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
	RunID           string      `json:"run_id"`
	StartedAt       time.Time   `json:"started_at"`
	FinishedAt      time.Time   `json:"finished_at"`
	DurationSeconds float64     `json:"duration_seconds"`
	Success         bool        `json:"success"`
	Requirements    []ReqStatus `json:"requirements"`
	Summary         TestSummary `json:"summary"`
}

type ReqStatus struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Status      string `json:"status"`
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
	fmt.Println("MULTI-AGENT PATHFINDING EVALUATION")
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

	data, _ := json.MarshalIndent(report, "", "  ")
	err := os.WriteFile("report.json", data, 0644)
	if err != nil {
		fmt.Printf("Error writing report.json: %v\n", err)
	} else {
		fmt.Println("Report saved to report.json")
	}

	hostPath := "/host/evaluation/report.json"
	if _, err := os.Stat("/host/evaluation"); err == nil {
		err = os.WriteFile(hostPath, data, 0644)
		if err != nil {
			fmt.Printf("Error writing report to %s: %v\n", hostPath, err)
		} else {
			fmt.Printf("Report successfully saved to host at: %s\n", hostPath)
		}
	} else {
		fallbackPath := "/host/report.json"
		if _, err := os.Stat("/host"); err == nil {
			_ = os.WriteFile(fallbackPath, data, 0644)
			fmt.Printf("Report saved to host fallback at: %s\n", fallbackPath)
		}
	}

	if !overallSuccess {
		os.Exit(1)
	}
}
