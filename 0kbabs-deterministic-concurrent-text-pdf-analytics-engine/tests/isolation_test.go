package tests

import (
	"os"
	"strings"
	"testing"
)

func TestAnalyzerStructExists(t *testing.T) {
	contentBytes, err := os.ReadFile(TargetSource)
	if err != nil {
		t.Fatalf("Failed to read main.go: %v", err)
	}
	content := string(contentBytes)

	if !strings.Contains(content, "type Analyzer struct") {
		t.Error("Analyzer struct not defined")
	}
	if !strings.Contains(content, "func NewAnalyzer()") && !strings.Contains(content, "func NewAnalyzer(") {
		t.Error("NewAnalyzer constructor not found")
	}
}

func TestNoPackageGlobals(t *testing.T) {
	contentBytes, err := os.ReadFile(TargetSource)
	if err != nil {
		t.Fatalf("Failed to read main.go: %v", err)
	}
	lines := strings.Split(string(contentBytes), "\n")

	inVarBlock := false
	suspiciousGlobals := []string{"registry", "registryMu", "procPool", "totalLength"}

	for _, line := range lines {
		stripped := strings.TrimSpace(line)
		if strings.HasPrefix(stripped, "var (") {
			inVarBlock = true
			continue
		}
		if stripped == ")" {
			inVarBlock = false
			continue
		}

		if inVarBlock || strings.HasPrefix(stripped, "var ") {
			for _, g := range suspiciousGlobals {
				if strings.Contains(stripped, g) && !strings.HasPrefix(stripped, "//") {
					if strings.Contains(stripped, "make(map[string]*tokenMeta)") {
						t.Errorf("Found forbidden global variable pattern: %s", stripped)
					}
				}
			}
		}
	}
}
