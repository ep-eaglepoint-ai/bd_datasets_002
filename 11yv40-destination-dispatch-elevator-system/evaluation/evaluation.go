package main

import (
    "crypto/rand"
    "encoding/json"
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "strings"
    "time"
)

type goTestEvent struct {
    Time    string  `json:"Time"`
    Action  string  `json:"Action"`
    Package string  `json:"Package"`
    Test    string  `json:"Test,omitempty"`
    Elapsed float64 `json:"Elapsed,omitempty"`
    Output  string  `json:"Output,omitempty"`
}

type TestResult struct {
    Name            string   `json:"name"`
    Status          string   `json:"status"`
    DurationMs      int64    `json:"duration_ms"`
    FailureMessages []string `json:"failureMessages"`
}

func newRunID() string {
    b := make([]byte, 16)
    _, err := rand.Read(b)
    if err != nil {
        return ""
    }
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func main() {
    start := time.Now().UTC()
    runID := newRunID()

    // Run the existing test runner script (via sh) and capture combined output so
    // we can parse the same `=== RUN` / `--- PASS:` / `--- FAIL:` lines.
    // Run the runner from the tests directory so relative paths inside the script work.
    // Run the test runner but skip the race detector inside the evaluator container
    // because the evaluate image may not support -race (CGO disabled).
    cmd := exec.Command("sh", "-c", "cd tests && NO_RACE=1 sh run_tests.sh")
    out, err := cmd.CombinedOutput()
    output := string(out)
    if err != nil {
        // Keep going; we'll include the error in the report but still try to parse output.
        fmt.Fprintln(os.Stderr, "test runner returned error:", err)
    }

    lines := strings.Split(output, "\n")
    tests := map[string]*TestResult{}
    var currentTest string
    for _, line := range lines {
        if strings.HasPrefix(line, "=== RUN") {
            parts := strings.Fields(line)
            if len(parts) >= 3 {
                name := parts[2]
                currentTest = name
                if _, ok := tests[name]; !ok {
                    tests[name] = &TestResult{Name: name}
                }
            }
            continue
        }
        if strings.HasPrefix(line, "--- ") {
            // Line format: '--- PASS: TestName (0.00s)'
            rest := strings.TrimPrefix(line, "--- ")
            parts := strings.Fields(rest)
            if len(parts) >= 2 {
                statusField := strings.TrimSuffix(parts[0], ":") // PASS, FAIL, SKIP
                name := parts[1]
                dur := int64(0)
                if len(parts) >= 3 {
                    d := strings.Trim(parts[2], "()s")
                    if parsed, err := time.ParseDuration(d + "s"); err == nil {
                        dur = parsed.Milliseconds()
                    }
                }
                tr, ok := tests[name]
                if !ok {
                    tr = &TestResult{Name: name}
                    tests[name] = tr
                }
                switch statusField {
                case "PASS":
                    tr.Status = "passed"
                case "FAIL":
                    tr.Status = "failed"
                case "SKIP":
                    tr.Status = "skipped"
                default:
                    tr.Status = strings.ToLower(statusField)
                }
                tr.DurationMs = dur
            }
            currentTest = ""
            continue
        }
        // capture indented output lines for the current test (failure details)
        if currentTest != "" {
            trimmed := strings.TrimSpace(line)
            if trimmed != "" {
                tr := tests[currentTest]
                if tr != nil {
                    tr.FailureMessages = append(tr.FailureMessages, trimmed)
                }
            }
        }
    }
    results := make([]TestResult, 0, len(tests))
    total := 0
    passed := 0
    failed := 0
    skipped := 0
    for _, tr := range tests {
        total++
        switch tr.Status {
        case "passed":
            passed++
        case "failed":
            failed++
        case "skipped":
            skipped++
        }
        results = append(results, *tr)
    }

    finish := time.Now().UTC()
    duration := finish.Sub(start).Seconds()

    hostname, _ := os.Hostname()

    report := map[string]interface{}{}
    report["run_id"] = runID
    report["started_at"] = start.Format(time.RFC3339)
    report["finished_at"] = finish.Format(time.RFC3339)
    report["duration_seconds"] = duration
    report["success"] = failed == 0
    if err != nil {
        report["error"] = err.Error()
    } else {
        report["error"] = nil
    }

    env := map[string]interface{}{
        "go_version":   runtime.Version(),
        "platform":     runtime.GOOS,
        "os":           runtime.GOOS,
        "architecture": runtime.GOARCH,
        "hostname":     hostname,
    }
    report["environment"] = env

    after := map[string]interface{}{}
    after["success"] = failed == 0
    after["exit_code"] = 0
    after["tests"] = results
    summary := map[string]interface{}{
        "total":   total,
        "passed":  passed,
        "failed":  failed,
        "xfailed": 0,
        "errors":  0,
        "skipped": skipped,
    }
    after["summary"] = summary

    comparison := map[string]interface{}{
        "after_tests_passed": failed == 0,
        "after_total":        total,
        "after_passed":       passed,
        "after_failed":       failed,
        "after_xfailed":      0,
    }

    resultsMap := map[string]interface{}{"after": after, "comparison": comparison}
    report["results"] = resultsMap

    // Write report at evaluation/YYYY-MM-DD/HH-MM-SS/report.json
    now := time.Now()
    dir := filepath.Join("evaluation", now.Format("2006-01-02"), now.Format("15-04-05"))
    if err := os.MkdirAll(dir, 0o755); err != nil {
        fmt.Fprintln(os.Stderr, "failed to create evaluation dir:", err)
        os.Exit(1)
    }
    outPath := filepath.Join(dir, "report.json")
    f, err := os.Create(outPath)
    if err != nil {
        fmt.Fprintln(os.Stderr, "failed to create report file:", err)
        os.Exit(1)
    }
    enc := json.NewEncoder(f)
    enc.SetIndent("", "  ")
    if err := enc.Encode(report); err != nil {
        fmt.Fprintln(os.Stderr, "failed to encode report:", err)
        os.Exit(1)
    }
    f.Close()

    fmt.Println("Wrote report:", outPath)
    _ = runID
}

