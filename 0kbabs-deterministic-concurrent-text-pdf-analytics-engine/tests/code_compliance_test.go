package tests

import (
	"os"
	"strings"
	"testing"
)

func TestNoUnsafe(t *testing.T) {
	contentBytes, err := os.ReadFile(TargetSource)
	if err != nil {
		t.Fatalf("Failed to read main.go: %v", err)
	}
	content := string(contentBytes)

	if strings.Contains(content, "unsafe.Pointer") {
		t.Error("Found unsafe.Pointer usage")
	}
	// Use quotes to avoid finding the string in comments or test code itself if naive grep
	if strings.Contains(content, "\"unsafe\"") {
		t.Error("Found \"unsafe\" import")
	}
}

func TestNoCDependencies(t *testing.T) {
	contentBytes, err := os.ReadFile(TargetSource)
	if err != nil {
		t.Fatalf("Failed to read main.go: %v", err)
	}
	lines := strings.Split(string(contentBytes), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "import \"C\"" {
			t.Error("Found import \"C\"")
		}
	}
}
