package tests

import (
	"fmt"
	"os"
	"testing"
)

func TestConcurrencySafety(t *testing.T) {
	repeats := 5000 // Increased to ensure race detection
	
	tmpFile, err := os.CreateTemp("", "stress_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	// Write unique lines to detect loop variable capture
	for i := 0; i < repeats; i++ {
		// keys: word0, word1, ...
		// If loop variable is captured, we will see counts missing for early i
		line := fmt.Sprintf("word%d ", i)
		tmpFile.WriteString(line + "\n")
	}
	tmpFile.Close()

	output, err := RunAnalyzer(t, TargetExe, tmpFile.Name())
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	
	for i := 0; i < repeats; i++ {
		key := fmt.Sprintf("word%d", i)
		if val, ok := counts[key]; !ok || val != 1 {
			t.Errorf("Race/Capture detected: Expected %s to be 1, got %d. (Missing or overwritten)", key, val)
			// fast fail to avoid spamming 5000 errors
			if i > 5 {
				t.Fatalf("Too many errors, aborting check.")
			}
		}
	}
}
