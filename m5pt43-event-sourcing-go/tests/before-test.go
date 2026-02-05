package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	fmt.Println("Running before-test...")
	fmt.Println("This test expects repository_before to be empty and should fail.")

	// Get the project root directory (parent of tests/)
	// When run with 'go run', os.Args[0] is the temp binary, so use current working directory
	wd, _ := os.Getwd()
	projectRoot := filepath.Dir(wd)
	if filepath.Base(wd) == "tests" {
		// We're in tests directory
	} else {
		// We're in project root
		projectRoot = wd
	}
	repoBefore := filepath.Join(projectRoot, "repository_before")

	// Check if repository_before exists and is empty
	if entries, err := os.ReadDir(repoBefore); err == nil {
		// Filter out .gitkeep and other hidden files
		visibleFiles := 0
		for _, entry := range entries {
			if entry.Name() != ".gitkeep" && entry.Name()[0] != '.' {
				visibleFiles++
			}
		}
		if visibleFiles > 0 {
			fmt.Println("ERROR: repository_before is not empty")
			os.Exit(1)
		}
	}

	// Try to build (should fail or not be possible)
	// Check if there are any Go files
	goFiles, _ := filepath.Glob(filepath.Join(repoBefore, "*.go"))
	if len(goFiles) > 0 {
		fmt.Println("ERROR: Found Go files in repository_before")
		os.Exit(1)
	}
	
	// If we reach here, it means the repository is empty or missing implementation.
	// As per requirements, before-test should FAIL on empty before-repo.
	fmt.Println("before-test: FAIL (no implementation found in repository_before)")
	os.Exit(1)
}
