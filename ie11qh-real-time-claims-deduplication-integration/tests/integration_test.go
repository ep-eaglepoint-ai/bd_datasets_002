package tests

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"testing"
	"time"

	claimsdeduplication "claims-deduplication"
)

// TestFullIntegration tests the complete claims processing pipeline
func TestFullIntegration(t *testing.T) {
	// Create temporary EDI files
	tempDir := t.TempDir()
	
	// First file with duplicate claims
	ediFile1 := createTempEDIFile(t, tempDir, "test1.edi", `BHT*0019*00*123456789*20231201*1405*CH*1234567890~
CLM*CLAIM001*100*HC*12345:45:67~
NM1*IL*1*DOE*JOHN****MI*PAT001~
DTP*472*RD8*20231201~
DTP*232*RD8*20231201~
SV1*HC*12345*50*UN*1~
CLM*CLAIM002*200*HC*67890:12:34~
NM1*IL*1*SMITH*JANE****MI*PAT002~
DTP*472*RD8*20231201~
DTP*232*RD8*20231201~
SV1*HC*67890*100*UN*1~
`)
	
	// Second file with some duplicates from first file and new ones
	ediFile2 := createTempEDIFile(t, tempDir, "test2.edi", `BHT*0019*00*123456789*20231202*1405*CH*1234567890~
CLM*CLAIM001*150*HC*12345:45:67~
NM1*IL*1*DOE*JOHN****MI*PAT001~
DTP*472*RD8*20231201~
DTP*232*RD8*20231202~
SV1*HC*12345*75*UN*1~
CLM*CLAIM003*300*HC*11111:22:33~
NM1*IL*1*BROWN*BOB****MI*PAT003~
DTP*472*RD8*20231202~
DTP*232*RD8*20231202~
SV1*HC*11111*150*UN*2~
`)
	
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[INTEGRATION] ", log.LstdFlags)
	
	// Create parser and deduplicator directly
	parser := claimsdeduplication.NewEDIParser(logger)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	// Process files manually
	var allClaims []*claimsdeduplication.Claim
	
	// First file
	content1, err := os.ReadFile(ediFile1)
	if err != nil {
		t.Fatalf("Error reading file %s: %v", ediFile1, err)
	}
	
	claims1, err := parser.ParseClaimsFromEDI(string(content1))
	if err != nil {
		t.Fatalf("Error parsing EDI content from %s: %v", ediFile1, err)
	}
	allClaims = append(allClaims, claims1...)
	
	// Second file
	content2, err := os.ReadFile(ediFile2)
	if err != nil {
		t.Fatalf("Error reading file %s: %v", ediFile2, err)
	}
	
	claims2, err := parser.ParseClaimsFromEDI(string(content2))
	if err != nil {
		t.Fatalf("Error parsing EDI content from %s: %v", ediFile2, err)
	}
	allClaims = append(allClaims, claims2...)
	
	// Deduplicate all claims together
	result := deduplicator.DeduplicateClaims(allClaims)
	
	// Should have 3 unique claims (CLAIM001 replaced by newer version, CLAIM002, CLAIM003)
	if len(result.KeptClaims) != 3 {
		t.Errorf("Expected 3 kept claims, got %d", len(result.KeptClaims))
	}
	
	// Should have 1 discarded claim (older CLAIM001)
	if len(result.DiscardedClaims) != 1 {
		t.Errorf("Expected 1 discarded claim, got %d", len(result.DiscardedClaims))
	}
	
	// Should have 1 decision recorded
	if len(result.Decisions) != 1 {
		t.Errorf("Expected 1 decision, got %d", len(result.Decisions))
	}
	
	// Verify CLAIM001 was replaced by newer version
	var claim001 *claimsdeduplication.Claim
	for _, claim := range result.KeptClaims {
		if claim.ClaimId == "CLAIM001" {
			claim001 = claim
			break
		}
	}
	
	if claim001 == nil {
		t.Fatal("Expected to find CLAIM001 in kept claims")
	}
	
	if claim001.TotalAmount != 150.0 {
		t.Errorf("Expected CLAIM001 amount 150.0, got %f", claim001.TotalAmount)
	}
	
	// Verify submission date is the newer one
	expectedDate := time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC)
	if !claim001.ClaimSubmissionDate.Equal(expectedDate) {
		t.Errorf("Expected CLAIM001 submission date %v, got %v", expectedDate, claim001.ClaimSubmissionDate)
	}
}

// TestEdgeCases tests various edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[EDGE_CASES] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	// Test with nil claims slice
	result := deduplicator.DeduplicateClaims(nil)
	if len(result.KeptClaims) != 0 {
		t.Errorf("Expected 0 kept claims for nil input, got %d", len(result.KeptClaims))
	}
	
	// Test with empty claims slice
	result = deduplicator.DeduplicateClaims([]*claimsdeduplication.Claim{})
	if len(result.KeptClaims) != 0 {
		t.Errorf("Expected 0 kept claims for empty input, got %d", len(result.KeptClaims))
	}
	
	// Test with single claim
	singleClaim := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}
	
	result = deduplicator.DeduplicateClaims([]*claimsdeduplication.Claim{singleClaim})
	if len(result.KeptClaims) != 1 {
		t.Errorf("Expected 1 kept claim for single input, got %d", len(result.KeptClaims))
	}
	
	if len(result.DiscardedClaims) != 0 {
		t.Errorf("Expected 0 discarded claims for single input, got %d", len(result.DiscardedClaims))
	}
}

// TestMissingFields tests requirement 9: handle missing fields gracefully
func TestMissingFields(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[MISSING_FIELDS] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	// Claims with missing PatientId
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "", // Missing
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}
	
	// Claims with missing ClaimId
	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "", // Missing
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}
	
	// Valid claim
	claim3 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM003",
		PatientId:         "PAT003",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}
	
	claims := []*claimsdeduplication.Claim{claim1, claim2, claim3}
	result := deduplicator.DeduplicateClaims(claims)
	
	// All claims should be kept (invalid keys are not deduplicated)
	if len(result.KeptClaims) != 3 {
		t.Errorf("Expected 3 kept claims, got %d", len(result.KeptClaims))
	}
	
	// No claims should be discarded
	if len(result.DiscardedClaims) != 0 {
		t.Errorf("Expected 0 discarded claims, got %d", len(result.DiscardedClaims))
	}
	
	// No decisions should be recorded (no valid duplicates)
	if len(result.Decisions) != 0 {
		t.Errorf("Expected 0 decisions, got %d", len(result.Decisions))
	}
}

// TestPartialParsingFailures tests requirement 9: partial parsing failures
func TestPartialParsingFailures(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[PARTIAL_PARSE] ", log.LstdFlags)
	
	parser := claimsdeduplication.NewEDIParser(logger)
	
	// EDI content with malformed segments
	ediContent := `BHT*0019*00*123456789*20231201*1405*CH*1234567890~
CLM*CLAIM001*100*HC*12345:45:67~
NM1*IL*1*DOE*JOHN****MI*PAT001~
DTP*472*RD8*INVALID_DATE~
DTP*232*RD8*20231201~
SV1*HC*12345*50*UN*1~
MALFORMED_SEGMENT
CLM*CLAIM002*200*HC*67890:12:34~
NM1*IL*1*SMITH*JANE****MI*PAT002~
DTP*472*RD8*20231201~
DTP*232*RD8*20231201~
SV1*HC*67890*100*UN*1~
`
	
	claims, err := parser.ParseClaimsFromEDI(ediContent)
	if err != nil {
		t.Fatalf("Error parsing EDI content: %v", err)
	}
	
	// Should still parse some claims despite malformed segments
	if len(claims) < 1 {
		t.Errorf("Expected at least 1 claim, got %d", len(claims))
	}
	
	// First claim should have valid submission date even if service date failed
	claim1 := claims[0]
	if claim1.ClaimSubmissionDate.IsZero() {
		t.Error("Expected CLAIM001 to have valid submission date")
	}
}

// TestZeroValueServiceDate tests requirement 9: zero-value service dates
func TestZeroValueServiceDate(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[ZERO_DATE] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	// Claims with zero-value service date
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Time{}, // Zero value
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
	}
	
	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Same ID
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Time{}, // Same zero value
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
	}
	
	claims := []*claimsdeduplication.Claim{claim1, claim2}
	result := deduplicator.DeduplicateClaims(claims)
	
	// Both claims should be kept (invalid keys are not deduplicated)
	if len(result.KeptClaims) != 2 {
		t.Errorf("Expected 2 kept claims, got %d", len(result.KeptClaims))
	}
	
	// No claims should be discarded
	if len(result.DiscardedClaims) != 0 {
		t.Errorf("Expected 0 discarded claims, got %d", len(result.DiscardedClaims))
	}
}

// TestOrderPreservation tests requirement 4: preserve original position when replacing
func TestOrderPreservation(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[ORDER] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	// Create claims where the second one should replace the first
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC), // Older
		TotalAmount:       100.0,
	}
	
	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM002",
		PatientId:         "PAT002",
		ServiceDateFrom:   time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC),
		TotalAmount:       200.0,
	}
	
	claim3 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Same as claim1
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC), // Newer
		TotalAmount:       150.0,
	}
	
	claim4 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM003",
		PatientId:         "PAT003",
		ServiceDateFrom:   time.Date(2023, 12, 03, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 03, 0, 0, 0, 0, time.UTC),
		TotalAmount:       300.0,
	}
	
	claims := []*claimsdeduplication.Claim{claim1, claim2, claim3, claim4}
	result := deduplicator.DeduplicateClaims(claims)
	
	// Should have 3 kept claims (claim1 replaced by claim3)
	if len(result.KeptClaims) != 3 {
		t.Errorf("Expected 3 kept claims, got %d", len(result.KeptClaims))
	}
	
	// Verify all expected claims are present
	foundClaim001 := false
	foundClaim002 := false
	foundClaim003 := false
	
	for _, claim := range result.KeptClaims {
		switch claim.ClaimId {
		case "CLAIM001":
			foundClaim001 = true
			if claim.TotalAmount != 150.0 {
				t.Errorf("Expected CLAIM001 to have newer amount 150.0, got %f", claim.TotalAmount)
			}
		case "CLAIM002":
			foundClaim002 = true
		case "CLAIM003":
			foundClaim003 = true
		}
	}
	
	if !foundClaim001 {
		t.Error("Expected to find CLAIM001 in kept claims")
	}
	if !foundClaim002 {
		t.Error("Expected to find CLAIM002 in kept claims")
	}
	if !foundClaim003 {
		t.Error("Expected to find CLAIM003 in kept claims")
	}
	
	// Verify claim1 was discarded
	if len(result.DiscardedClaims) != 1 {
		t.Errorf("Expected 1 discarded claim, got %d", len(result.DiscardedClaims))
	}
	
	if result.DiscardedClaims[0].TotalAmount != 100.0 {
		t.Errorf("Expected discarded claim to have older amount 100.0, got %f", result.DiscardedClaims[0].TotalAmount)
	}
}

// TestIdenticalSubmissionDates tests requirement 10: identical submission dates
func TestIdenticalSubmissionDates(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[IDENTICAL_DATES] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	sameDate := time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC)
	
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: sameDate,
		TotalAmount:       100.0,
	}
	
	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Same key
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: sameDate, // Identical submission date
		TotalAmount:       150.0,
	}
	
	claim3 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Same key
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: sameDate, // Identical submission date
		TotalAmount:       200.0,
	}
	
	claims := []*claimsdeduplication.Claim{claim1, claim2, claim3}
	result := deduplicator.DeduplicateClaims(claims)
	
	// Should keep only 1 claim (first encountered wins)
	if len(result.KeptClaims) != 1 {
		t.Errorf("Expected 1 kept claim, got %d", len(result.KeptClaims))
	}
	
	// Should discard 2 claims
	if len(result.DiscardedClaims) != 2 {
		t.Errorf("Expected 2 discarded claims, got %d", len(result.DiscardedClaims))
	}
	
	// First claim should be kept (first encountered wins)
	if result.KeptClaims[0].TotalAmount != 100.0 {
		t.Errorf("Expected first claim (100.0) to be kept, got %f", result.KeptClaims[0].TotalAmount)
	}
}

// TestDifferentAmountsSameKey tests requirement 10: identical keys with different amounts
func TestDifferentAmountsSameKey(t *testing.T) {
	var logBuffer bytes.Buffer
	logger := log.New(&logBuffer, "[DIFFERENT_AMOUNTS] ", log.LstdFlags)
	deduplicator := claimsdeduplication.NewClaimsDeduplicator(logger)
	
	claim1 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001",
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		TotalAmount:       100.0,
	}
	
	claim2 := &claimsdeduplication.Claim{
		ClaimId:           "CLAIM001", // Same key
		PatientId:         "PAT001",
		ServiceDateFrom:   time.Date(2023, 12, 01, 0, 0, 0, 0, time.UTC),
		ClaimSubmissionDate: time.Date(2023, 12, 02, 0, 0, 0, 0, time.UTC), // Newer
		TotalAmount:       250.0, // Different amount
	}
	
	claims := []*claimsdeduplication.Claim{claim1, claim2}
	result := deduplicator.DeduplicateClaims(claims)
	
	// Should keep 1 claim (newer one)
	if len(result.KeptClaims) != 1 {
		t.Errorf("Expected 1 kept claim, got %d", len(result.KeptClaims))
	}
	
	// Should keep the newer claim with higher amount
	if result.KeptClaims[0].TotalAmount != 250.0 {
		t.Errorf("Expected newer claim (250.0) to be kept, got %f", result.KeptClaims[0].TotalAmount)
	}
}

// Helper function to create temporary EDI files
func createTempEDIFile(t *testing.T, dir, filename, content string) string {
	filePath := filepath.Join(dir, filename)
	err := os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		t.Fatalf("Failed to create temporary EDI file %s: %v", filePath, err)
	}
	return filePath
}
