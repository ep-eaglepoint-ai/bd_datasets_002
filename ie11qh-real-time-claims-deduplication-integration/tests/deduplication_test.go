package tests

import (
	"bytes"
	"fmt"
	"log"
	"strings"
	"testing"
	"time"

	claimsdeduplication "claims-deduplication"
)

// TestCompositeKeyCreation tests requirement 1: composite key with case-sensitive matching
func TestCompositeKeyCreation(t *testing.T) {
	claim := &claimsdeduplication.Claim{
		ClaimId:         "CLAIM123",
		PatientId:       "PAT456",
		ServiceDateFrom: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	expectedKey := "CLAIM123|PAT456|2023-12-01"
	actualKey := claim.CompositeKey()

	if actualKey != expectedKey {
		t.Errorf("Expected composite key %s, got %s", expectedKey, actualKey)
	}
}

// TestCaseSensitivity tests requirement 1: case-sensitive matching
func TestCaseSensitivity(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	// Create claims with same content but different case in ClaimId
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "claim123", // Different case
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	claim3 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "pat001", // Different case
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	claims := []*claimsdeduplication.Claim{claim1, claim2, claim3}
	result := deduplicator.DeduplicateClaims(claims)

	// All should be kept because keys are case-sensitive
	if len(result.KeptClaims) != 3 {
		t.Errorf("Expected 3 kept claims due to case sensitivity, got %d", len(result.KeptClaims))
	}

	if len(result.DiscardedClaims) != 0 {
		t.Errorf("Expected 0 discarded claims due to case sensitivity, got %d", len(result.DiscardedClaims))
	}

	// Verify composite keys are different
	if claim1.CompositeKey() == claim2.CompositeKey() {
		t.Error("Expected different composite keys for CLAIM123 vs claim123")
	}

	if claim1.CompositeKey() == claim3.CompositeKey() {
		t.Error("Expected different composite keys for PAT001 vs pat001")
	}
}

// TestClaimValidation tests requirement 1: empty/missing fields handling
func TestClaimValidation(t *testing.T) {
	tests := []struct {
		name     string
		claim    *claimsdeduplication.Claim
		expected bool
	}{
		{
			name: "Valid claim",
			claim: &claimsdeduplication.Claim{
				ClaimId:         "CLAIM123",
				PatientId:       "PAT456",
				ServiceDateFrom: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
			},
			expected: true,
		},
		{
			name: "Empty ClaimId",
			claim: &claimsdeduplication.Claim{
				ClaimId:         "",
				PatientId:       "PAT456",
				ServiceDateFrom: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
			},
			expected: false,
		},
		{
			name: "Empty PatientId",
			claim: &claimsdeduplication.Claim{
				ClaimId:         "CLAIM123",
				PatientId:       "",
				ServiceDateFrom: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
			},
			expected: false,
		},
		{
			name: "Zero ServiceDateFrom",
			claim: &claimsdeduplication.Claim{
				ClaimId:         "CLAIM123",
				PatientId:       "PAT456",
				ServiceDateFrom: time.Time{},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.claim.IsValidKey()
			if result != tt.expected {
				t.Errorf("Expected IsValidKey() to return %v, got %v", tt.expected, result)
			}
		})
	}
}

// TestShouldReplaceLogic tests requirement 2: newer submission date wins
func TestShouldReplaceLogic(t *testing.T) {
	olderClaim := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		TotalAmount:       100.0,
	}

	newerClaim := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		TotalAmount:       150.0,
	}

	if !newerClaim.ShouldReplace(olderClaim) {
		t.Error("Expected newer claim to replace older claim")
	}

	if olderClaim.ShouldReplace(newerClaim) {
		t.Error("Expected older claim not to replace newer claim")
	}
}

// TestFirstEncounteredWins tests requirement 2: identical dates → first encountered wins
func TestFirstEncounteredWins(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		TotalAmount:       100.0,
	}

	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC), // Same date
		TotalAmount:       150.0,
	}

	claims := []*claimsdeduplication.Claim{claim1, claim2}
	result := deduplicator.DeduplicateClaims(claims)

	if len(result.KeptClaims) != 1 {
		t.Errorf("Expected 1 kept claim, got %d", len(result.KeptClaims))
	}

	if len(result.DiscardedClaims) != 1 {
		t.Errorf("Expected 1 discarded claim, got %d", len(result.DiscardedClaims))
	}

	// First claim should be kept (first encountered wins)
	if result.KeptClaims[0].TotalAmount != 100.0 {
		t.Errorf("Expected first claim (100.0) to be kept, got %f", result.KeptClaims[0].TotalAmount)
	}

	if result.DiscardedClaims[0].TotalAmount != 150.0 {
		t.Errorf("Expected second claim (150.0) to be discarded, got %f", result.DiscardedClaims[0].TotalAmount)
	}
}

// TestBasicDeduplication tests requirements 2-3: basic deduplication with memory efficiency
func TestBasicDeduplication(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		TotalAmount:       100.0,
	}

	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM456",
		PatientId:         "PAT789",
		ServiceDateFrom:   time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		TotalAmount:       200.0,
	}

	claim3 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123", // Duplicate of claim1
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC), // Newer
		TotalAmount:       150.0,
	}

	claims := []*claimsdeduplication.Claim{claim1, claim2, claim3}
	result := deduplicator.DeduplicateClaims(claims)

	// Should keep 2 unique claims (claim1 replaced by claim3, and claim2)
	if len(result.KeptClaims) != 2 {
		t.Errorf("Expected 2 kept claims, got %d", len(result.KeptClaims))
	}

	// Should discard 1 claim
	if len(result.DiscardedClaims) != 1 {
		t.Errorf("Expected 1 discarded claim, got %d", len(result.DiscardedClaims))
	}

	// Memory usage should be proportional to unique claims
	if deduplicator.GetUniqueClaimCount() != 2 {
		t.Errorf("Expected 2 unique claims in memory, got %d", deduplicator.GetUniqueClaimCount())
	}
}

// TestMultipleDuplicates tests requirement 10: multiple duplicates (3-4 versions)
func TestMultipleDuplicates(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	baseDate := time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC)
	
	// Create 4 versions of the same claim with increasing submission dates
	var claims []*claimsdeduplication.Claim
	for i := 0; i < 4; i++ {
		claim := &claimsdeduplication.Claim{
			ClaimId:           "CLAIM123",
			PatientId:         "PAT456",
			ServiceDateFrom:   baseDate,
			ClaimSubmissionDate: baseDate.AddDate(0, 0, i),
			TotalAmount:       float64(100 + i*50),
		}
		claims = append(claims, claim)
	}

	result := deduplicator.DeduplicateClaims(claims)

	// Should keep only 1 claim (the newest)
	if len(result.KeptClaims) != 1 {
		t.Errorf("Expected 1 kept claim, got %d", len(result.KeptClaims))
	}

	// Should discard 3 claims
	if len(result.DiscardedClaims) != 3 {
		t.Errorf("Expected 3 discarded claims, got %d", len(result.DiscardedClaims))
	}

	// The kept claim should be the newest (highest amount)
	if result.KeptClaims[0].TotalAmount != 250.0 {
		t.Errorf("Expected newest claim (250.0) to be kept, got %f", result.KeptClaims[0].TotalAmount)
	}

	// Memory usage should be 1 unique claim
	if deduplicator.GetUniqueClaimCount() != 1 {
		t.Errorf("Expected 1 unique claim in memory, got %d", deduplicator.GetUniqueClaimCount())
	}
}

// TestInvalidKeyHandling tests requirement 1: invalid keys are kept but not deduplicated
func TestInvalidKeyHandling(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	// Claims with invalid keys (missing fields)
	invalidClaim1 := &claimsdeduplication.Claim{
		ClaimId:           "", // Empty ClaimId
		PatientId:         "PAT456",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	invalidClaim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM123",
		PatientId:         "", // Empty PatientId
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	// Valid claim
	validClaim := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM456",
		PatientId:         "PAT789",
		ServiceDateFrom:   time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
	}

	claims := []*claimsdeduplication.Claim{invalidClaim1, invalidClaim2, validClaim}
	result := deduplicator.DeduplicateClaims(claims)

	// All claims should be kept (invalid keys are not deduplicated)
	if len(result.KeptClaims) != 3 {
		t.Errorf("Expected 3 kept claims, got %d", len(result.KeptClaims))
	}

	// No claims should be discarded
	if len(result.DiscardedClaims) != 0 {
		t.Errorf("Expected 0 discarded claims, got %d", len(result.DiscardedClaims))
	}
}

// TestMemoryEfficiency tests requirement 3: O(unique claims) memory usage
func TestMemoryEfficiency(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	// Create many claims with only a few unique keys
	baseDate := time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC)
	var claims []*claimsdeduplication.Claim

	// Create 1000 claims but only 10 unique keys
	for i := 0; i < 1000; i++ {
		claim := &claimsdeduplication.Claim{
			ClaimId:           fmt.Sprintf("CLAIM%03d", i%10), // Only 10 unique IDs
			PatientId:         fmt.Sprintf("PAT%03d", i%10),
			ServiceDateFrom:   baseDate.AddDate(0, 0, i%10),
			ClaimSubmissionDate: baseDate.AddDate(0, 0, i),
			TotalAmount:       float64(100 + i),
		}
		claims = append(claims, claim)
	}

	result := deduplicator.DeduplicateClaims(claims)

	// Should only keep 10 unique claims
	if len(result.KeptClaims) != 10 {
		t.Errorf("Expected 10 kept claims for 10 unique keys, got %d", len(result.KeptClaims))
	}

	// Should discard 990 claims
	if len(result.DiscardedClaims) != 990 {
		t.Errorf("Expected 990 discarded claims, got %d", len(result.DiscardedClaims))
	}

	// Memory usage should be proportional to unique claims (10), not total claims (1000)
	uniqueCount := deduplicator.GetUniqueClaimCount()
	if uniqueCount != 10 {
		t.Errorf("Expected unique claim count to be 10, got %d", uniqueCount)
	}

	// Verify that we're not accidentally keeping references to all discarded claims
	if uniqueCount > len(result.KeptClaims) {
		t.Errorf("Internal memory tracking (%d) exceeds kept claims (%d) - possible memory leak", uniqueCount, len(result.KeptClaims))
	}
}

// TestDeterministicOutput tests requirement 4: predictable order
func TestDeterministicOutput(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	
	// Create identical claims multiple times
	claims := []*claimsdeduplication.Claim{
		{
			ClaimId:           "CLAIM001",
			PatientId:         "PAT001",
			ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
			ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		},
		{
			ClaimId:           "CLAIM002",
			PatientId:         "PAT002",
			ServiceDateFrom:   time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
			ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		},
		{
			ClaimId:           "CLAIM003",
			PatientId:         "PAT003",
			ServiceDateFrom:   time.Date(2023, 12, 03, 0, 0, 0, 0, time.UTC),
			ClaimSubmissionDate: time.Date(2023, 12, 03, 0, 0, 0, 0, time.UTC),
		},
	}

	// Run deduplication twice with identical input
	deduplicator1 := claimsdeduplication.NewClaimsDeduplicator(logger)
	result1 := deduplicator1.DeduplicateClaims(claims)

	deduplicator2 := claimsdeduplication.NewClaimsDeduplicator(logger)
	result2 := deduplicator2.DeduplicateClaims(claims)

	// Results should be identical
	if len(result1.KeptClaims) != len(result2.KeptClaims) {
		t.Errorf("Expected same number of kept claims, got %d and %d", len(result1.KeptClaims), len(result2.KeptClaims))
	}

	for i := 0; i < len(result1.KeptClaims); i++ {
		if result1.KeptClaims[i].ClaimId != result2.KeptClaims[i].ClaimId {
			t.Errorf("Expected same claim order at index %d, got %s and %s", i, result1.KeptClaims[i].ClaimId, result2.KeptClaims[i].ClaimId)
		}
	}
}

// TestPerformanceRequirement tests requirement 7: performance under 10% overhead
func TestPerformanceRequirement(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	// Create 5000 claims
	baseDate := time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC)
	var claims []*claimsdeduplication.Claim

	for i := 0; i < 5000; i++ {
		claim := &claimsdeduplication.Claim{
			ClaimId:           fmt.Sprintf("CLAIM%06d", i),
			PatientId:         fmt.Sprintf("PAT%06d", i),
			ServiceDateFrom:   baseDate.AddDate(0, 0, i%365),
			ClaimSubmissionDate: baseDate.AddDate(0, 0, i),
			TotalAmount:       float64(100 + i),
		}
		claims = append(claims, claim)
	}

	// Measure deduplication time
	start := time.Now()
	result := deduplicator.DeduplicateClaims(claims)
	duration := time.Since(start)

	// Should complete within reasonable time (much less than 70 seconds for 1000 claims)
	if duration > 1*time.Second {
		t.Errorf("Deduplication took too long: %v for 5000 claims", duration)
	}

	// Should process all claims
	if len(result.KeptClaims) != 5000 {
		t.Errorf("Expected 5000 kept claims, got %d", len(result.KeptClaims))
	}

	// Log performance for reference
	claimsPerMs := float64(len(claims)) / float64(duration.Milliseconds())
	t.Logf("Processed %d claims in %v (%.2f claims/ms)", len(claims), duration, claimsPerMs)
}

// TestLoggingBehavior tests requirement 5: comprehensive logging
func TestLoggingBehavior(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[TEST] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)

	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}

	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Duplicate
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC), // Newer
	}

	claims := []*claimsdeduplication.Claim{claim1, claim2}
	result := deduplicator.DeduplicateClaims(claims)

	logOutput := logBuffer.String()

	// Should contain decision log
	if !strings.Contains(logOutput, "Deduplication Decision") {
		t.Error("Expected log to contain 'Deduplication Decision'")
	}

	// Should contain composite key
	if !strings.Contains(logOutput, "CLAIM001|PAT001|2023-12-01") {
		t.Error("Expected log to contain composite key")
	}

	// Should contain resolution reason
	if !strings.Contains(logOutput, "newer_submission_date") {
		t.Error("Expected log to contain 'newer_submission_date' reason")
	}

	// Should contain claim IDs
	if !strings.Contains(logOutput, "CLAIM001") {
		t.Error("Expected log to contain claim ID 'CLAIM001'")
	}

	// Should have recorded decision
	if len(result.Decisions) != 1 {
		t.Errorf("Expected 1 decision recorded, got %d", len(result.Decisions))
	}
}
