package comprehensive

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
)

// TestCreateLead verifies successful lead creation with all valid fields
func TestCreateLead(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	payload := map[string]interface{}{
		"name":       "New Lead",
		"email":      "newlead@example.com",
		"lead_score": 75,
		"status":     "QUALIFIED",
	}

	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(backendURL+"/api/leads", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("Failed to create lead: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 200/201, got %d: %s", resp.StatusCode, string(body))
	}

	var created map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&created)

	if created["id"] == nil {
		t.Error("Created lead should have an ID")
	}

	if created["version"] != float64(1) {
		t.Errorf("New lead should have version=1, got %v", created["version"])
	}

	if created["name"] != "New Lead" {
		t.Errorf("Expected name 'New Lead', got %v", created["name"])
	}

	t.Logf("Lead created successfully: ID=%v, version=%v", created["id"], created["version"])
}

// TestCreateLeadInvalidScore verifies score constraint enforcement
func TestCreateLeadInvalidScore(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	testCases := []struct {
		name  string
		score int
	}{
		{"Score below 0", -1},
		{"Score above 100", 101},
		{"Score way below", -999},
		{"Score way above", 9999},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"name":       "Invalid Score Lead",
				"email":      "invalid@example.com",
				"lead_score": tc.score,
				"status":     "PROSPECT",
			}

			jsonData, _ := json.Marshal(payload)
			resp, err := http.Post(backendURL+"/api/leads", "application/json", bytes.NewBuffer(jsonData))
			if err != nil {
				t.Fatalf("Failed to send request: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
				t.Errorf("Expected error for invalid score %d, but creation succeeded", tc.score)
			}

			t.Logf("Correctly rejected invalid score %d with status %d", tc.score, resp.StatusCode)
		})
	}
}

// TestGetLead verifies lead retrieval by ID
func TestGetLead(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	leadID, err := createTestLead("Get Test Lead", "get@example.com", 65, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	resp, err := http.Get(fmt.Sprintf("%s/api/leads/%d", backendURL, leadID))
	if err != nil {
		t.Fatalf("Failed to get lead: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 200, got %d: %s", resp.StatusCode, string(body))
	}

	var lead map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&lead)

	if lead["name"] != "Get Test Lead" {
		t.Errorf("Expected name 'Get Test Lead', got %v", lead["name"])
	}

	if lead["email"] != "get@example.com" {
		t.Errorf("Expected email 'get@example.com', got %v", lead["email"])
	}

	if lead["lead_score"] != float64(65) {
		t.Errorf("Expected score 65, got %v", lead["lead_score"])
	}

	t.Logf("Lead retrieved successfully: %+v", lead)
}

// TestGetNonExistentLead verifies 404 for non-existent leads
func TestGetNonExistentLead(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	resp, err := http.Get(fmt.Sprintf("%s/api/leads/99999", backendURL))
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("Expected 404 Not Found, got %d: %s", resp.StatusCode, string(body))
	}

	t.Log("Correctly returned 404 for non-existent lead")
}

// TestUpdateLeadAllFields verifies updating all lead fields
func TestUpdateLeadAllFields(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	leadID, _ := createTestLead("Original Name", "original@example.com", 50, "PROSPECT")
	version, _ := getLeadVersion(leadID)

	updatePayload := map[string]interface{}{
		"name":       "Updated Name",
		"email":      "updated@example.com",
		"lead_score": 85,
		"status":     "CONVERTED",
		"version":    version,
	}

	jsonData, _ := json.Marshal(updatePayload)
	req, _ := http.NewRequest("PUT", fmt.Sprintf("%s/api/leads/%d", backendURL, leadID), bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Failed to update lead: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 200, got %d: %s", resp.StatusCode, string(body))
	}

	lead, _ := getLead(leadID)

	if lead["name"] != "Updated Name" {
		t.Errorf("Name not updated: got %v", lead["name"])
	}

	if lead["email"] != "updated@example.com" {
		t.Errorf("Email not updated: got %v", lead["email"])
	}

	if lead["lead_score"] != 85 {
		t.Errorf("Score not updated: got %v", lead["lead_score"])
	}

	if lead["status"] != "CONVERTED" {
		t.Errorf("Status not updated: got %v", lead["status"])
	}

	if lead["version"] != version+1 {
		t.Errorf("Version should increment to %d, got %v", version+1, lead["version"])
	}

	t.Logf("All fields updated successfully, version: %d -> %d", version, lead["version"])
}

// TestDeleteLead verifies lead deletion
func TestDeleteLead(t *testing.T) {
	cleanupLeads()
	waitForBackend(t)

	leadID, _ := createTestLead("To Delete", "delete@example.com", 60, "QUALIFIED")

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/leads/%d", backendURL, leadID), nil)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Failed to delete lead: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 200/204, got %d: %s", resp.StatusCode, string(body))
	}

	getResp, _ := http.Get(fmt.Sprintf("%s/api/leads/%d", backendURL, leadID))
	defer getResp.Body.Close()

	if getResp.StatusCode != http.StatusNotFound {
		t.Errorf("Lead should not exist after deletion, got status %d", getResp.StatusCode)
	}

	t.Log("Lead deleted successfully and verified")
}
