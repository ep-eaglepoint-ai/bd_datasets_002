package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	fmt.Println("Running meta-test...")

	// Get the project root directory
	// When run with 'go run', os.Args[0] is the temp binary, so use current working directory
	wd, _ := os.Getwd()
	testsDir := wd
	if filepath.Base(wd) != "tests" {
		// We're in project root
		testsDir = filepath.Join(wd, "tests")
	}

	// Test 1: after-test should exist
	afterTestPath := filepath.Join(testsDir, "after-test.go")
	if _, err := os.Stat(afterTestPath); os.IsNotExist(err) {
		fmt.Println("ERROR: after-test.go not found")
		os.Exit(1)
	}

	// Test 2: after-test should pass on correct implementation
	fmt.Println("Testing after-test on correct implementation...")
	cmd := exec.Command("go", "run", "after-test.go")
	cmd.Dir = testsDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Println("ERROR: after-test failed on correct implementation")
		os.Exit(1)
	}

	// Test 3: Validate broken code example exists
	brokenCodePath := filepath.Join(testsDir, "resource", "broken-code", "main.go")
	if _, err := os.Stat(brokenCodePath); os.IsNotExist(err) {
		fmt.Println("WARNING: broken-code example not found")
	} else {
		// Try to build broken code (should fail)
		cmd := exec.Command("go", "build", "main.go")
		cmd.Dir = filepath.Dir(brokenCodePath)
		if err := cmd.Run(); err == nil {
			fmt.Println("WARNING: broken-code example compiles (should not)")
		}
	}

	// Test 4: Validate working code example
	workingCodePath := filepath.Join(testsDir, "resource", "working-code", "main.go")
	if _, err := os.Stat(workingCodePath); os.IsNotExist(err) {
		fmt.Println("WARNING: working-code example not found")
	} else {
		fmt.Println("Validating working code example...")
		cmd := exec.Command("go", "build", "main.go")
		cmd.Dir = filepath.Dir(workingCodePath)
		if err := cmd.Run(); err != nil {
			fmt.Println("WARNING: Working code example doesn't compile")
		}
	}

	fmt.Println("meta-test: PASS")
	os.Exit(0)
}
