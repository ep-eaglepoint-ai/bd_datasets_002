package tests

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
)

func TestMutationAnalysis(t *testing.T) {
	_, filename, _, _ := runtime.Caller(0)
	root := filepath.Dir(filepath.Dir(filename))
	batchFile := filepath.Join(root, "repository_after", "batch", "batch.go")
	testDir := filepath.Join(root, "repository_after", "batch", "unit_test")

	// 1. Baseline: Ensure tests pass initially
	t.Log("Running baseline tests...")
	runTests(t, testDir, true)

	// Read original content
	originalContent, err := os.ReadFile(batchFile)
	if err != nil {
		t.Fatalf("Failed to read batch.go: %v", err)
	}

	// 2. Mutation: Disable Cache
	// Find "if opts.EnableCache {" and replace with "if false {"
	mutateAndVerify(t, batchFile, originalContent, testDir, "Disable Cache",
		"if opts.EnableCache {", "if false {")

	// 3. Mutation: Break Retry
	// Find "if attempt < opts.Retries {" and replace with "if false {"
	mutateAndVerify(t, batchFile, originalContent, testDir, "Break Retry",
		"if attempt < opts.Retries {", "if false {")

	// 4. Mutation: Break Circuit Breaker
	// Find "if !cb.allow(id) {" and replace with "if false {"
	mutateAndVerify(t, batchFile, originalContent, testDir, "Break Circuit Breaker",
		"if !cb.allow(id) {", "if false {")
}

func mutateAndVerify(t *testing.T, file string, original []byte, dir, name, target, replacement string) {
	t.Logf("Applying mutation: %s", name)

	mutated := bytes.Replace(original, []byte(target), []byte(replacement), 1)
	if bytes.Equal(mutated, original) {
		t.Fatalf("Mutation %s failed: target string not found", name)
	}

	if err := os.WriteFile(file, mutated, 0644); err != nil {
		t.Fatalf("Failed to write mutation: %v", err)
	}
	defer os.WriteFile(file, original, 0644) // Ensure revert

	// Expect failure
	runTests(t, dir, false)
}

func runTests(t *testing.T, dir string, expectPass bool) {
	cmd := exec.Command("go", "test", "-v", "-count=1", ".")
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()

	if expectPass {
		if err != nil {
			t.Fatalf("Tests failed unexpectedly:\n%s", string(out))
		}
	} else {
		if err == nil {
			t.Fatalf("Tests passed unexpectedly (mutation was not caught)!")
		}
		t.Log("Mutation caught (tests failed as expected).")
	}
}
