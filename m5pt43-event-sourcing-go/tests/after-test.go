package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	fmt.Println("Running after-test...")

	// Get the project root directory
	// When run with 'go run', os.Args[0] is the temp binary, so use current working directory
	wd, _ := os.Getwd()
	projectRoot := filepath.Dir(wd)
	if filepath.Base(wd) == "tests" {
		// We're in tests directory
	} else {
		// We're in project root
		projectRoot = wd
	}
	repoAfter := filepath.Join(projectRoot, "repository_after")

	// Check if Go module exists
	if _, err := os.Stat(filepath.Join(repoAfter, "go.mod")); os.IsNotExist(err) {
		fmt.Println("ERROR: go.mod not found")
		os.Exit(1)
	}

	// Check if main packages exist
	requiredDirs := []string{
		"cmd/eventstore",
		"cmd/tests",
		"pkg/eventstore",
		"pkg/aggregate",
		"pkg/commandbus",
		"pkg/projection",
		"pkg/evolution",
		"pkg/outbox",
		"pkg/saga",
		"pkg/observability",
		"pkg/api",
	}

	for _, dir := range requiredDirs {
		fullPath := filepath.Join(repoAfter, dir)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			fmt.Printf("ERROR: Package %s not found\n", dir)
			os.Exit(1)
		}
	}

	// Try to build (should succeed)
	fmt.Println("Building Go module...")
	os.Setenv("CGO_ENABLED", "0")
	cmd := exec.Command("go", "build", "./...")
	cmd.Dir = repoAfter
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Println("ERROR: Build failed")
		os.Exit(1)
	}

	// Check if tests can be built
	cmd = exec.Command("go", "build", "-o", "/tmp/test-runner", "./cmd/tests")
	cmd.Dir = repoAfter
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Println("ERROR: Test runner build failed")
		os.Exit(1)
	}

	fmt.Println("after-test: PASS")
	os.Exit(0)
}
