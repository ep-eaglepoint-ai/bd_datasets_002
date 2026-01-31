package tests

import (
	"os"
	"strings"
	"testing"
)

func TestStreamingLargeInput(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "large_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	// Create ~20MB file
	chunk := []byte(strings.Repeat("word ", 1024) + "\n") // ~5KB
	targetSize := 20 * 1024 * 1024
	currentSize := 0
	for currentSize < targetSize {
		n, _ := tmpFile.Write(chunk)
		currentSize += n
	}
	tmpFile.Close()

	output, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	if val, ok := counts["word"]; !ok || val < 1000 {
		t.Error("Failed to count words in large file")
	}
}

func TestLongLineHandling(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "longline_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	longLine := strings.Repeat("long ", 100000)
	tmpFile.WriteString(longLine)
	tmpFile.Close()

	output, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	if val, ok := counts["long"]; !ok || val != 100000 {
		t.Errorf("Expected 100000, got %d", val)
	}
}
