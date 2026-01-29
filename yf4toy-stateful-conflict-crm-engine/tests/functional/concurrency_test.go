package functional

import (
	"sync"
	"testing"
)

// TestConcurrentUpdates simulates 10 concurrent goroutines attempting to update the same lead
func TestConcurrentUpdates(t *testing.T) {
	cleanupLeads()

	// Create a test lead
	leadID, err := createTestLead("John Doe", "john@example.com", 50, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	initialVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get initial version: %v", err)
	}

	if initialVersion != 1 {
		t.Errorf("Expected initial version to be 1, got %d", initialVersion)
	}

	// Number of concurrent goroutines
	numGoroutines := 10
	var wg sync.WaitGroup
	successCount := 0
	failureCount := 0
	var mu sync.Mutex

	// Launch concurrent updates
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			// Each goroutine reads the current version
			currentVersion, err := getLeadVersion(leadID)
			if err != nil {
				t.Logf("Goroutine %d: Failed to get version: %v", iteration, err)
				mu.Lock()
				failureCount++
				mu.Unlock()
				return
			}

			// Attempt to update with the version it observed
			newScore := 50 + iteration
			err = updateLeadWithVersion(leadID, "John Doe", "john@example.com", newScore, "PROSPECT", currentVersion)

			mu.Lock()
			if err != nil {
				failureCount++
				t.Logf("Goroutine %d: Update failed (expected for most): %v", iteration, err)
			} else {
				successCount++
				t.Logf("Goroutine %d: Update succeeded", iteration)
			}
			mu.Unlock()
		}(i)
	}

	// Wait for all goroutines to complete
	wg.Wait()

	// Verify results
	t.Logf("Success count: %d, Failure count: %d", successCount, failureCount)

	// At least some updates should fail due to version conflicts
	if failureCount == 0 {
		t.Error("Expected at least some concurrent updates to fail due to version conflicts")
	}

	// Check final version
	finalVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get final version: %v", err)
	}

	// The version should have incremented by the number of successful updates
	expectedFinalVersion := initialVersion + int64(successCount)
	if finalVersion != expectedFinalVersion {
		t.Errorf("Expected final version to be %d, got %d", expectedFinalVersion, finalVersion)
	}

	t.Logf("Initial version: %d, Final version: %d, Version increments: %d",
		initialVersion, finalVersion, finalVersion-initialVersion)
}

// TestConcurrentUpdatesSameVersion tests that only one update succeeds when all goroutines use the same version
func TestConcurrentUpdatesSameVersion(t *testing.T) {
	cleanupLeads()

	// Create a test lead
	leadID, err := createTestLead("Jane Smith", "jane@example.com", 60, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get the initial version
	initialVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get initial version: %v", err)
	}

	numGoroutines := 10
	var wg sync.WaitGroup
	successCount := 0
	failureCount := 0
	var mu sync.Mutex

	// All goroutines will use the same initial version
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			// All goroutines attempt update with the SAME initial version
			newScore := 60 + iteration
			err := updateLeadWithVersion(leadID, "Jane Smith", "jane@example.com", newScore, "QUALIFIED", initialVersion)

			mu.Lock()
			if err != nil {
				failureCount++
			} else {
				successCount++
			}
			mu.Unlock()
		}(i)
	}

	wg.Wait()

	// Exactly ONE update should succeed
	if successCount != 1 {
		t.Errorf("Expected exactly 1 successful update, got %d", successCount)
	}

	// The rest should fail
	if failureCount != numGoroutines-1 {
		t.Errorf("Expected %d failed updates, got %d", numGoroutines-1, failureCount)
	}

	// Final version should be initial + 1
	finalVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get final version: %v", err)
	}

	if finalVersion != initialVersion+1 {
		t.Errorf("Expected final version to be %d, got %d", initialVersion+1, finalVersion)
	}

	t.Logf("Concurrent updates with same version: Success=%d, Failures=%d, Final version=%d",
		successCount, failureCount, finalVersion)
}

// TestSequentialUpdates tests that sequential updates increment version correctly
func TestSequentialUpdates(t *testing.T) {
	cleanupLeads()

	// Create a test lead
	leadID, err := createTestLead("Bob Johnson", "bob@example.com", 70, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Perform 5 sequential updates
	numUpdates := 5
	for i := 0; i < numUpdates; i++ {
		currentVersion, err := getLeadVersion(leadID)
		if err != nil {
			t.Fatalf("Update %d: Failed to get version: %v", i+1, err)
		}

		newScore := 70 + i
		err = updateLeadWithVersion(leadID, "Bob Johnson", "bob@example.com", newScore, "PROSPECT", currentVersion)
		if err != nil {
			t.Fatalf("Update %d: Failed to update lead: %v", i+1, err)
		}

		// Verify version incremented
		newVersion, err := getLeadVersion(leadID)
		if err != nil {
			t.Fatalf("Update %d: Failed to get new version: %v", i+1, err)
		}

		if newVersion != currentVersion+1 {
			t.Errorf("Update %d: Expected version %d, got %d", i+1, currentVersion+1, newVersion)
		}
	}

	// Final version check
	finalVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get final version: %v", err)
	}

	expectedFinalVersion := int64(1 + numUpdates)
	if finalVersion != expectedFinalVersion {
		t.Errorf("Expected final version to be %d, got %d", expectedFinalVersion, finalVersion)
	}

	t.Logf("Sequential updates completed: Final version=%d", finalVersion)
}
