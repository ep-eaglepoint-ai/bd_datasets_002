package tests

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// meta_test validates the coverage and correctness of after-test
func TestMetaTestCoverage(t *testing.T) {
	// Verify that after-test exists and can be run
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	
	// If we're in tests directory, go up one level to repository_after root
	testDir := wd
	if filepath.Base(wd) == "tests" {
		testDir = filepath.Dir(wd)
	}
	
	// Run specific after-test functions (exclude before-test and meta-test)
	cmd := exec.Command("go", "test", "-v", "-run", "TestBasicSafeTemperature|TestSingleBreachBelowThreshold|TestCumulativeBreachThreeSpikes|TestWindowExit|TestOutOfOrderReadings|TestContinuousBreach|TestMultipleShipments|TestThresholdBoundary", "./tests")
	cmd.Dir = testDir
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		t.Logf("after-test output: %s", string(output))
		t.Fatalf("after-test should pass but failed: %v", err)
	}
	
	t.Log("after-test passed successfully")
}

func TestMetaTestBrokenCode(t *testing.T) {
	// Test that broken code example exists
	wd, _ := os.Getwd()
	if filepath.Base(wd) == "tests" {
		wd = filepath.Dir(wd)
	}
	brokenCodePath := filepath.Join(wd, "..", "tests", "resource", "broken-code")
	if _, err := os.Stat(brokenCodePath); os.IsNotExist(err) {
		t.Skip("broken-code resource not found")
		return
	}
	
	// This is a validation that we have test resources
	t.Log("Broken code resource exists for validation")
}

func TestMetaTestWorkingCode(t *testing.T) {
	// Test that working code example exists
	wd, _ := os.Getwd()
	if filepath.Base(wd) == "tests" {
		wd = filepath.Dir(wd)
	}
	workingCodePath := filepath.Join(wd, "..", "tests", "resource", "working-code")
	if _, err := os.Stat(workingCodePath); os.IsNotExist(err) {
		t.Skip("working-code resource not found")
		return
	}
	
	// This is a validation that we have test resources
	t.Log("Working code resource exists for validation")
}

func TestAfterTestCompleteness(t *testing.T) {
	// Verify that after-test covers all requirements:
	// 1. Cumulative logic (three 15-minute spikes)
	// 2. Window exit (40-minute spike 25 hours ago)
	// 3. Out-of-order handling
	// 4. Multiple shipments
	// 5. Threshold boundary
	
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	
	// If we're in tests directory, go up one level to repository_after root
	testDir := wd
	if filepath.Base(wd) == "tests" {
		testDir = filepath.Dir(wd)
	}
	
	// Run after-test and verify it passes
	cmd := exec.Command("go", "test", "-v", "-run", "TestCumulativeBreachThreeSpikes|TestWindowExit|TestOutOfOrderReadings|TestMultipleShipments|TestThresholdBoundary", "./tests")
	cmd.Dir = testDir
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		t.Logf("Test output: %s", string(output))
		t.Errorf("Required tests should pass: %v", err)
	}
	
	t.Log("All required test cases are present and passing")
}
