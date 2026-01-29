package tests

import (
	"bytes"
	"os"
	"regexp"
	"testing"
	"time"

	"gocode/analyzer"
)

func TestCloseReturnsPromptly(t *testing.T) {
	svc := analyzer.NewHeavyService()
	done := make(chan struct{})
	go func() {
		svc.Close()
		close(done)
	}()

	select {
	case <-done:
		// ok
	case <-time.After(2 * time.Second):
		t.Fatalf("Close() did not return promptly; background goroutine may be stuck")
	}
}

func TestIngestAndReportStatsUnlocked_Format(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc.Ingest(200)
	out := svc.ReportStatsUnlocked()

	re := regexp.MustCompile(`^Alloc=\d+MiB TotalAlloc=\d+MiB Sys=\d+MiB NumGC=\d+$`)
	if !re.MatchString(out) {
		t.Fatalf("unexpected ReportStatsUnlocked format: %q", out)
	}
}

func TestReportStats_WritesExpectedFields(t *testing.T) {
	orig := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	os.Stdout = w
	t.Cleanup(func() {
		os.Stdout = orig
		_ = r.Close()
	})

	analyzer.ReportStats()

	_ = w.Close()
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	s := buf.String()

	// Exact numbers vary; just assert the observable shape.
	mustContain := []string{"Alloc = ", "TotalAlloc = ", "Sys = ", "NumGC = "}
	for _, sub := range mustContain {
		if !bytes.Contains(buf.Bytes(), []byte(sub)) {
			t.Fatalf("expected output to contain %q; got %q", sub, s)
		}
	}
}


