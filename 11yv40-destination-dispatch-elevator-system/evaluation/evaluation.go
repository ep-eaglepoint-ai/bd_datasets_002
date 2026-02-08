package main

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/json"
    "fmt"
    "io"
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

    cmd := exec.Command("sh", "-c", "cd tests && NO_RACE=1 go test -json .")
    out, err := cmd.CombinedOutput()
    output := string(out)
    if err != nil {
        // Keep going; we'll include the error in the report but still try to parse output.
        fmt.Fprintln(os.Stderr, "test runner returned error:", err)
    }

    tests := map[string]*TestResult{}
    dec := json.NewDecoder(strings.NewReader(output))
    for dec.More() {
        var ev goTestEvent
        if err := dec.Decode(&ev); err != nil {
            break
        }
        if ev.Test == "" {
            continue
        }
        tr, ok := tests[ev.Test]
        if !ok {
            tr = &TestResult{Name: ev.Test}
            tests[ev.Test] = tr
        }
        switch ev.Action {
        case "pass":
            tr.Status = "passed"
            tr.DurationMs = int64(ev.Elapsed * 1000)
        case "fail":
            tr.Status = "failed"
            tr.DurationMs = int64(ev.Elapsed * 1000)
        case "skip":
            tr.Status = "skipped"
            tr.DurationMs = int64(ev.Elapsed * 1000)
        case "output":
            trimmed := strings.TrimSpace(ev.Output)
            if trimmed != "" && (tr.Status == "failed" || strings.Contains(trimmed, "FAIL")) {
                tr.FailureMessages = append(tr.FailureMessages, trimmed)
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
    report["go_test_command"] = "cd tests && NO_RACE=1 go test -json ."
    if hash, files, hashErr := hashDir("tests"); hashErr == nil {
        report["tests_fingerprint_sha256"] = hash
        report["tests_files"] = files
    } else {
        report["tests_fingerprint_error"] = hashErr.Error()
    }
    if hash, files, hashErr := hashDir("repository_after"); hashErr == nil {
        report["repository_after_fingerprint_sha256"] = hash
        report["repository_after_files"] = files
    } else {
        report["repository_after_fingerprint_error"] = hashErr.Error()
    }
    report["success"] = failed == 0 && err == nil && total > 0
    if err != nil {
        report["error"] = err.Error()
    } else if total == 0 {
        report["error"] = "no tests discovered"
    } else {
        report["error"] = nil
    }

  
    ver := "go 1.18"
    env := map[string]interface{}{
        "go_version":   ver,
        "platform":     runtime.GOOS,
        "os":           runtime.GOOS,
        "architecture": runtime.GOARCH,
        "hostname":     hostname,
    }
    report["environment"] = env

    after := map[string]interface{}{}
    after["success"] = failed == 0 && err == nil && total > 0
    if err != nil || total == 0 {
        after["exit_code"] = 1
    } else {
        after["exit_code"] = 0
    }
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
        "after_tests_passed": failed == 0 && err == nil && total > 0,
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

func hashDir(root string) (string, []string, error) {
    h := sha256.New()
    files := []string{}
    err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        if info.IsDir() {
            return nil
        }
        rel, relErr := filepath.Rel(root, path)
        if relErr != nil {
            return relErr
        }
        files = append(files, rel)
        if _, err := h.Write([]byte(rel)); err != nil {
            return err
        }
        f, err := os.Open(path)
        if err != nil {
            return err
        }
        if _, err := io.Copy(h, f); err != nil {
            f.Close()
            return err
        }
        f.Close()
        return nil
    })
    if err != nil {
        return "", nil, err
    }
    return fmt.Sprintf("%x", h.Sum(nil)), files, nil
}
