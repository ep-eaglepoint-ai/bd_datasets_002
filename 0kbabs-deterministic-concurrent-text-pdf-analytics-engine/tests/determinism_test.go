package tests

import (
	"os"
	"strings"
	"testing"
)

func TestDeterminism(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "determ_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	

	tmpFile.WriteString("apple banana cherry apple banana cherry date date date\n")
	tmpFile.Close()

	out1, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Run 1 failed: %v", err)
	}

	out2, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Run 2 failed: %v", err)
	}

	if out1 != out2 {
		t.Logf("Run 1:\n%s\nRun 2:\n%s", out1, out2)
		t.Error("Output not deterministic")
	}

	// Check sort order
	lines := strings.Split(out1, "\n")
	var dataLines []string
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if strings.Contains(trimmed, ": ") && !strings.HasPrefix(trimmed, "---") {
			dataLines = append(dataLines, trimmed)
		}
	}
	
	if len(dataLines) < 4 {
		t.Logf("Full Output:\n%s", out1)
		t.Fatalf("Not enough output lines: %v", dataLines)
	}
	// Check that we have the expected data roughly
	if len(dataLines) < 4 {
		t.Logf("Full Output:\n%s", out1)
		t.Fatalf("Not enough output lines: %v", dataLines)
	}
	// Highest count first
	if dataLines[0] != "date: 3" {
		t.Errorf("Expected date: 3, got %s", dataLines[0])
	}
	// The rest should be deterministic (checked by out1==out2) and correct counts
	// We verify contents presence
	contentMap := make(map[string]bool)
	for _, l := range dataLines {
		contentMap[l] = true
	}
	if !contentMap["apple: 2"] {
		t.Error("Missing apple: 2")
	}
	if !contentMap["banana: 2"] {
		t.Error("Missing banana: 2")
	}
	if !contentMap["cherry: 2"] {
		t.Error("Missing cherry: 2")
	}
}
