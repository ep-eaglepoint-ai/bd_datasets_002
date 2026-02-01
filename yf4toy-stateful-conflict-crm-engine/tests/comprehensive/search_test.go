package comprehensive

import (
	"strings"
	"testing"
)

// TestSearchByName verifies name-based search with partial matching
func TestSearchByName(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create test leads with various names
	_, err := createTestLead("Alice Johnson", "alice@example.com", 50, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create lead: %v", err)
	}

	_, err = createTestLead("Bob Smith", "bob@example.com", 60, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create lead: %v", err)
	}

	_, err = createTestLead("Alice Brown", "brown@example.com", 70, "CONVERTED")
	if err != nil {
		t.Fatalf("Failed to create lead: %v", err)
	}

	// Search for "Alice" - should return 2 leads
	leads := searchLeads(t, "Alice")

	if len(leads) != 2 {
		t.Errorf("Expected 2 leads matching 'Alice', got %d", len(leads))
	}

	// Verify all results contain "Alice" in the name
	for _, lead := range leads {
		name := lead["name"].(string)
		if !strings.Contains(name, "Alice") {
			t.Errorf("Lead name does not contain 'Alice': %s", name)
		}
	}

	// Test case-insensitive search
	leadsLower := searchLeads(t, "alice")
	if len(leadsLower) != 2 {
		t.Errorf("Case-insensitive search failed: expected 2 leads, got %d", len(leadsLower))
	}

	t.Logf("Search by name test passed: found %d leads matching 'Alice'", len(leads))
}

// TestSearchByEmail verifies email-based search
func TestSearchByEmail(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create test leads
	createTestLead("John Doe", "john.doe@example.com", 55, "PROSPECT")
	createTestLead("Jane Smith", "jane.smith@anotherdomain.com", 65, "QUALIFIED")
	createTestLead("Bob Johnson", "bob@example.com", 75, "CONVERTED")

	// Search for email domain "example.com"
	leads := searchLeads(t, "example.com")

	// Should match john.doe@example.com and bob@example.com
	if len(leads) != 2 {
		t.Errorf("Expected 2 leads with 'example.com', got %d", len(leads))
	}

	// Verify email contains search term
	for _, lead := range leads {
		email := lead["email"].(string)
		if !strings.Contains(strings.ToLower(email), "example.com") {
			t.Errorf("Lead email does not contain 'example.com': %s", email)
		}
	}

	// Test partial email search
	partialLeads := searchLeads(t, "jane")
	if len(partialLeads) != 1 {
		t.Errorf("Partial email search failed: expected 1 lead, got %d", len(partialLeads))
	}

	t.Logf("Search by email test passed: found %d leads", len(leads))
}

// TestSearchByStatus verifies status-based filtering
func TestSearchByStatus(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create leads with different statuses
	createTestLead("Lead1", "lead1@test.com", 40, "PROSPECT")
	createTestLead("Lead2", "lead2@test.com", 50, "PROSPECT")
	createTestLead("Lead3", "lead3@test.com", 60, "QUALIFIED")
	createTestLead("Lead4", "lead4@test.com", 85, "CONVERTED")

	// Search for PROSPECT status
	prospectLeads := searchLeads(t, "PROSPECT")
	if len(prospectLeads) != 2 {
		t.Errorf("Expected 2 PROSPECT leads, got %d", len(prospectLeads))
	}

	// Search for QUALIFIED status
	qualifiedLeads := searchLeads(t, "QUALIFIED")
	if len(qualifiedLeads) != 1 {
		t.Errorf("Expected 1 QUALIFIED lead, got %d", len(qualifiedLeads))
	}

	// Search for CONVERTED status (case-insensitive)
	convertedLeads := searchLeads(t, "converted")
	if len(convertedLeads) != 1 {
		t.Errorf("Expected 1 CONVERTED lead (case-insensitive), got %d", len(convertedLeads))
	}

	t.Logf("Search by status test passed")
}

// TestSearchNoResults verifies empty results handling
func TestSearchNoResults(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create some leads
	createTestLead("Alice", "alice@example.com", 50, "PROSPECT")
	createTestLead("Bob", "bob@example.com", 60, "QUALIFIED")

	// Search for non-existent term
	leads := searchLeads(t, "NonExistentSearchTerm12345")

	// Should return empty array, not error
	if leads == nil {
		t.Error("Search should return empty array, not nil")
	}

	if len(leads) != 0 {
		t.Errorf("Expected 0 results for non-existent search, got %d", len(leads))
	}

	t.Log("No results test passed: returned empty array as expected")
}

// TestSearchEmptyQueryReturnsAll verifies empty query fallback
func TestSearchEmptyQueryReturnsAll(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create multiple leads
	createTestLead("Lead1", "lead1@test.com", 40, "PROSPECT")
	createTestLead("Lead2", "lead2@test.com", 50, "QUALIFIED")
	createTestLead("Lead3", "lead3@test.com", 60, "CONVERTED")

	// Search with empty query
	leads := searchLeads(t, "")

	// According to handler.go lines 60-62, empty query calls GetAllLeads
	if len(leads) != 3 {
		t.Errorf("Empty query should return all leads (3), got %d", len(leads))
	}

	t.Logf("Empty query test passed: returned all %d leads", len(leads))
}

// TestSearchMultipleMatches verifies multi-field search without duplicates
func TestSearchMultipleMatches(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create a lead where search term matches multiple fields
	// Name: "John Smith", Email: "john@example.com"
	// Search term "john" matches both name and email
	createTestLead("John Smith", "john@example.com", 55, "PROSPECT")
	createTestLead("Jane Doe", "jane@example.com", 65, "QUALIFIED")

	// Search for "john"
	leads := searchLeads(t, "john")

	// Should return exactly 1 lead (no duplicates even though 2 fields match)
	if len(leads) != 1 {
		t.Errorf("Expected 1 lead (no duplicates), got %d", len(leads))
	}

	// Verify it's the correct lead
	if len(leads) > 0 {
		name := leads[0]["name"].(string)
		if name != "John Smith" {
			t.Errorf("Expected 'John Smith', got '%s'", name)
		}
	}

	t.Log("Multiple field match test passed: no duplicate results")
}

// TestSearchSpecialCharacters verifies SQL injection protection
func TestSearchSpecialCharacters(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	// Create normal leads
	createTestLead("Test Lead", "test@example.com", 50, "PROSPECT")
	createTestLead("Sample User", "sample@test.com", 60, "QUALIFIED")

	// Test special characters that could break SQL queries
	specialSearches := []string{
		"'; DROP TABLE leads; --",       // SQL injection attempt
		"test%",                         // SQL wildcard
		"test_",                         // SQL single char wildcard
		"test'",                         // Single quote
		`test"`,                         // Double quote
		"test\\",                        // Backslash
		"<script>alert('xss')</script>", // XSS attempt
	}

	for _, search := range specialSearches {
		// These should not cause errors or SQL injection
		leads := searchLeads(t, search)

		// Just verify the query completes without error
		// Result count doesn't matter, as long as it doesn't crash
		t.Logf("Special character search completed: '%s' returned %d leads", search, len(leads))
	}

	// Verify table still exists and has data
	allLeads := searchLeads(t, "")
	if len(allLeads) != 2 {
		t.Error("Table may have been affected by SQL injection attempt")
	}

	t.Log("Special characters test passed: SQL injection protection verified")
}

// TestSearchCaseInsensitivity verifies case-insensitive search
func TestSearchCaseInsensitivity(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	createTestLead("MixedCase Name", "UPPERCASE@EXAMPLE.COM", 60, "QUALIFIED")

	lowerSearch := searchLeads(t, "mixedcase")
	upperSearch := searchLeads(t, "MIXEDCASE")
	mixedSearch := searchLeads(t, "MiXeDcAsE")

	if len(lowerSearch) != 1 || len(upperSearch) != 1 || len(mixedSearch) != 1 {
		t.Errorf("Case-insensitive search failed: lower=%d, upper=%d, mixed=%d", len(lowerSearch), len(upperSearch), len(mixedSearch))
	}

	t.Log("Case-insensitive search verified across all cases")
}

// TestSearchPartialMatching verifies partial string matches
func TestSearchPartialMatching(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	createTestLead("Christopher Johnson", "chris.j@example.com", 70, "QUALIFIED")

	partialName := searchLeads(t, "chris")
	partialEmail := searchLeads(t, "@example")
	partialDomain := searchLeads(t, ".com")

	if len(partialName) != 1 {
		t.Errorf("Partial name search failed, got %d results", len(partialName))
	}

	if len(partialEmail) < 1 {
		t.Errorf("Partial email search failed, got %d results", len(partialEmail))
	}

	if len(partialDomain) < 1 {
		t.Errorf("Partial domain search failed, got %d results", len(partialDomain))
	}

	t.Log("Partial matching verified for name, email, and domain")
}

// TestSearchEmptyDatabase verifies search on empty database returns empty array
func TestSearchEmptyDatabase(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	leads := searchLeads(t, "anything")

	if leads == nil {
		t.Error("Search should return empty array, not nil")
	}

	if len(leads) != 0 {
		t.Errorf("Expected 0 results on empty database, got %d", len(leads))
	}

	t.Log("Empty database search correctly returned empty array")
}
