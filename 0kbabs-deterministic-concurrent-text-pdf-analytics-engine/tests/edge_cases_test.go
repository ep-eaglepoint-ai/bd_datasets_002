package tests

import (
	"os"
	"testing"
)

func TestEmptyFile(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "empty_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	tmpFile.Close()
	defer os.Remove(tmpFile.Name())

	output, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}
	counts := ParseReport(output)
	if len(counts) != 0 {
		t.Errorf("Expected empty result, got %v", counts)
	}
}

func TestSpecialChars(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "special_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	
	tmpFile.WriteString("Hello! World? @User #Tag 123")
	tmpFile.Close()

	output, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}
	counts := ParseReport(output)
	
	expected := []string{"hello", "world", "user", "tag", "123"}
	for _, w := range expected {
		if _, ok := counts[w]; !ok {
			t.Errorf("Missing expected word: %s", w)
		}
	}
}
