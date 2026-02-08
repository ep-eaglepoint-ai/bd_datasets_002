package comprehensive

import (
	"fmt"
	"sync"
	"testing"
)

// TestConcurrentUpdates verifies optimistic locking with concurrent goroutines
func TestConcurrentUpdates(t *testing.T) {
	cleanupLeads()

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

	numGoroutines := 10
	var wg sync.WaitGroup
	successCount := 0
	failureCount := 0
	var mu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			currentVersion, err := getLeadVersion(leadID)
			if err != nil {
				t.Logf("Goroutine %d: Failed to get version: %v", iteration, err)
				mu.Lock()
				failureCount++
				mu.Unlock()
				return
			}

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

	wg.Wait()

	t.Logf("Success count: %d, Failure count: %d", successCount, failureCount)

	if failureCount == 0 {
		t.Error("Expected at least some concurrent updates to fail due to version conflicts")
	}

	finalVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get final version: %v", err)
	}

	expectedFinalVersion := initialVersion + int64(successCount)
	if finalVersion != expectedFinalVersion {
		t.Errorf("Expected final version to be %d, got %d", expectedFinalVersion, finalVersion)
	}

	t.Logf("Initial version: %d, Final version: %d, Version increments: %d",
		initialVersion, finalVersion, finalVersion-initialVersion)
}

// TestConcurrentUpdatesSameVersion verifies only one update succeeds with same version
func TestConcurrentUpdatesSameVersion(t *testing.T) {
	cleanupLeads()

	leadID, err := createTestLead("Jane Smith", "jane@example.com", 60, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	initialVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get initial version: %v", err)
	}

	numGoroutines := 10
	var wg sync.WaitGroup
	successCount := 0
	failureCount := 0
	var mu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

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

	if successCount != 1 {
		t.Errorf("Expected exactly 1 successful update, got %d", successCount)
	}

	if failureCount != numGoroutines-1 {
		t.Errorf("Expected %d failed updates, got %d", numGoroutines-1, failureCount)
	}

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

// TestSequentialUpdates verifies version increments sequentially
func TestSequentialUpdates(t *testing.T) {
	cleanupLeads()

	leadID, err := createTestLead("Bob Johnson", "bob@example.com", 70, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

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

		newVersion, err := getLeadVersion(leadID)
		if err != nil {
			t.Fatalf("Update %d: Failed to get new version: %v", i+1, err)
		}

		if newVersion != currentVersion+1 {
			t.Errorf("Update %d: Expected version %d, got %d", i+1, currentVersion+1, newVersion)
		}
	}

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

// TestHighConcurrencyStress verifies system stability with 100 concurrent updates
func TestHighConcurrencyStress(t *testing.T) {
	cleanupLeads()

	leadID, err := createTestLead("Stress Test Lead", "stress@example.com", 50, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	numGoroutines := 100
	var wg sync.WaitGroup
	successCount := 0
	failureCount := 0
	var mu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			currentVersion, err := getLeadVersion(leadID)
			if err != nil {
				mu.Lock()
				failureCount++
				mu.Unlock()
				return
			}

			newScore := 50 + (iteration % 50)
			err = updateLeadWithVersion(leadID, "Stress Test Lead", "stress@example.com", newScore, "PROSPECT", currentVersion)

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

	t.Logf("Stress test: 100 goroutines -> Success=%d, Failures=%d", successCount, failureCount)

	if successCount == 0 {
		t.Error("At least some updates should succeed in high concurrency")
	}

	if failureCount == 0 {
		t.Error("Expected failures due to version conflicts in high concurrency")
	}

	finalVersion, _ := getLeadVersion(leadID)
	if finalVersion != 1+int64(successCount) {
		t.Errorf("Version mismatch: expected %d, got %d", 1+successCount, finalVersion)
	}
}

// TestConcurrentCreateAndUpdate verifies race-free concurrent creates and updates
func TestConcurrentCreateAndUpdate(t *testing.T) {
	cleanupLeads()

	var wg sync.WaitGroup
	var mu sync.Mutex
	createdIDs := []int{}
	createErrors := 0
	updateErrors := 0

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			id, err := createTestLead(
				fmt.Sprintf("Concurrent Lead %d", iteration),
				fmt.Sprintf("concurrent%d@example.com", iteration),
				50+iteration,
				"PROSPECT",
			)

			mu.Lock()
			if err != nil {
				createErrors++
			} else {
				createdIDs = append(createdIDs, id)
			}
			mu.Unlock()
		}(i)
	}

	wg.Wait()

	if createErrors > 0 {
		t.Errorf("Expected no create errors, got %d", createErrors)
	}

	if len(createdIDs) != 10 {
		t.Errorf("Expected 10 created leads, got %d", len(createdIDs))
	}

	for _, id := range createdIDs {
		wg.Add(1)
		go func(leadID int) {
			defer wg.Done()

			version, _ := getLeadVersion(leadID)
			err := updateLeadWithVersion(leadID, "Updated", "updated@example.com", 80, "QUALIFIED", version)

			mu.Lock()
			if err != nil {
				updateErrors++
			}
			mu.Unlock()
		}(id)
	}

	wg.Wait()

	if updateErrors > 0 {
		t.Errorf("Expected no update errors, got %d", updateErrors)
	}

	t.Logf("Concurrent create/update: Created=%d, Updated successfully=%d", len(createdIDs), len(createdIDs)-updateErrors)
}
