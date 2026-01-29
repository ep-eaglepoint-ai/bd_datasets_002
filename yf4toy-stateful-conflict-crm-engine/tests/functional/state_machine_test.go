package functional

import (
	"testing"
)

// TestConversionWithInsufficientScore tests that conversion is rejected when lead score < 80
func TestConversionWithInsufficientScore(t *testing.T) {
	cleanupLeads()

	// Create a lead with score 79 (below threshold)
	leadID, err := createTestLead("Alice Low Score", "alice@example.com", 79, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get current version
	version, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Attempt to convert to CONVERTED status
	err = updateLeadWithVersion(leadID, "Alice Low Score", "alice@example.com", 79, "CONVERTED", version)

	// This should fail because score < 80
	if err == nil {
		t.Error("Expected update to fail due to insufficient score, but it succeeded")
	}

	// Verify the lead status hasn't changed
	lead, err := getLead(leadID)
	if err != nil {
		t.Fatalf("Failed to get lead: %v", err)
	}

	if lead["status"] != "QUALIFIED" {
		t.Errorf("Expected status to remain QUALIFIED, got %s", lead["status"])
	}

	t.Logf("Conversion correctly rejected for score %d (threshold is 80)", lead["lead_score"])
}

// TestConversionWithSufficientScore tests that conversion succeeds when lead score >= 80
func TestConversionWithSufficientScore(t *testing.T) {
	cleanupLeads()

	// Create a lead with score 80 (at threshold)
	leadID, err := createTestLead("Bob High Score", "bob@example.com", 80, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get current version
	version, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Attempt to convert to CONVERTED status
	err = updateLeadWithVersion(leadID, "Bob High Score", "bob@example.com", 80, "CONVERTED", version)

	// This should succeed
	if err != nil {
		t.Errorf("Expected update to succeed with score 80, but it failed: %v", err)
	}

	// Verify the lead status has changed
	lead, err := getLead(leadID)
	if err != nil {
		t.Fatalf("Failed to get lead: %v", err)
	}

	if lead["status"] != "CONVERTED" {
		t.Errorf("Expected status to be CONVERTED, got %s", lead["status"])
	}

	t.Logf("Conversion correctly allowed for score %d", lead["lead_score"])
}

// TestConversionWithScore90 tests conversion with a high score
func TestConversionWithScore90(t *testing.T) {
	cleanupLeads()

	// Create a lead with score 90
	leadID, err := createTestLead("Charlie Excellent", "charlie@example.com", 90, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get current version
	version, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Attempt to convert
	err = updateLeadWithVersion(leadID, "Charlie Excellent", "charlie@example.com", 90, "CONVERTED", version)

	if err != nil {
		t.Errorf("Expected conversion to succeed with score 90, but it failed: %v", err)
	}

	// Verify status
	lead, err := getLead(leadID)
	if err != nil {
		t.Fatalf("Failed to get lead: %v", err)
	}

	if lead["status"] != "CONVERTED" {
		t.Errorf("Expected status CONVERTED, got %s", lead["status"])
	}

	t.Logf("High score conversion successful: score=%d, status=%s", lead["lead_score"], lead["status"])
}

// TestBoundaryScores tests various boundary conditions for conversion
func TestBoundaryScores(t *testing.T) {
	testCases := []struct {
		name          string
		score         int
		initialStatus string
		targetStatus  string
		shouldSucceed bool
	}{
		{"Score 0 - No Conversion", 0, "PROSPECT", "CONVERTED", false},
		{"Score 50 - No Conversion", 50, "QUALIFIED", "CONVERTED", false},
		{"Score 79 - No Conversion", 79, "QUALIFIED", "CONVERTED", false},
		{"Score 80 - Allow Conversion", 80, "QUALIFIED", "CONVERTED", true},
		{"Score 85 - Allow Conversion", 85, "QUALIFIED", "CONVERTED", true},
		{"Score 100 - Allow Conversion", 100, "QUALIFIED", "CONVERTED", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cleanupLeads()

			leadID, err := createTestLead("Test Lead", "test@example.com", tc.score, tc.initialStatus)
			if err != nil {
				t.Fatalf("Failed to create test lead: %v", err)
			}

			version, err := getLeadVersion(leadID)
			if err != nil {
				t.Fatalf("Failed to get version: %v", err)
			}

			err = updateLeadWithVersion(leadID, "Test Lead", "test@example.com", tc.score, tc.targetStatus, version)

			if tc.shouldSucceed && err != nil {
				t.Errorf("Expected conversion to succeed for score %d, but it failed: %v", tc.score, err)
			}

			if !tc.shouldSucceed && err == nil {
				t.Errorf("Expected conversion to fail for score %d, but it succeeded", tc.score)
			}

			// Verify final status
			lead, err := getLead(leadID)
			if err != nil {
				t.Fatalf("Failed to get lead: %v", err)
			}

			if tc.shouldSucceed && lead["status"] != tc.targetStatus {
				t.Errorf("Expected status %s, got %s", tc.targetStatus, lead["status"])
			}

			if !tc.shouldSucceed && lead["status"] != tc.initialStatus {
				t.Errorf("Expected status to remain %s, got %s", tc.initialStatus, lead["status"])
			}
		})
	}
}
