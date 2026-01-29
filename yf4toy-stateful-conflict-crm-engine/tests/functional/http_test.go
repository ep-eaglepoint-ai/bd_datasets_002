package functional

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"
)

var backendURL string

func init() {
	backendURL = os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8080"
	}
}

// waitForBackend waits for the backend to be ready
func waitForBackend(t *testing.T) {
	maxRetries := 30
	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(backendURL + "/health")
		if err == nil && resp.StatusCode == 200 {
			resp.Body.Close()
			t.Log("Backend is ready")
			return
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(1 * time.Second)
	}
	t.Fatal("Backend not ready after 30 seconds")
}

// TestVersionMismatchReturns409 verifies that an update with expired version returns HTTP 409
func TestVersionMismatchReturns409(t *testing.T) {
	waitForBackend(t)
	cleanupLeads()

	// Create a test lead
	leadID, err := createTestLead("Test User", "test@example.com", 75, "PROSPECT")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get initial version
	initialVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Perform a successful update (this will increment the version)
	err = updateLeadWithVersion(leadID, "Test User Updated", "test@example.com", 76, "PROSPECT", initialVersion)
	if err != nil {
		t.Fatalf("First update failed: %v", err)
	}

	// Now try to update with the old (expired) version via API
	updatePayload := map[string]interface{}{
		"name":       "Test User Conflict",
		"email":      "test@example.com",
		"lead_score": 77,
		"status":     "PROSPECT",
		"version":    initialVersion, // Using expired version
	}

	jsonData, _ := json.Marshal(updatePayload)
	resp, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/leads/%d", backendURL, leadID), bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	resp.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(resp)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer response.Body.Close()

	// Should return 409 Conflict
	if response.StatusCode != http.StatusConflict {
		body, _ := io.ReadAll(response.Body)
		t.Errorf("Expected status 409 Conflict, got %d. Body: %s", response.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	// Parse response
	var conflictResponse map[string]interface{}
	err = json.Unmarshal(body, &conflictResponse)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify response contains error and fresh_data
	if _, ok := conflictResponse["error"]; !ok {
		t.Error("Expected 'error' field in conflict response")
	}

	if _, ok := conflictResponse["fresh_data"]; !ok {
		t.Error("Expected 'fresh_data' field in conflict response")
	} else {
		freshData := conflictResponse["fresh_data"].(map[string]interface{})

		// Verify fresh_data contains updated version
		if freshVersion, ok := freshData["version"].(float64); ok {
			if int64(freshVersion) != initialVersion+1 {
				t.Errorf("Expected fresh version to be %d, got %v", initialVersion+1, freshVersion)
			}
		} else {
			t.Error("Fresh data does not contain version field")
		}

		t.Logf("Conflict response received with fresh data: version=%v", freshData["version"])
	}
}

// TestConversionRejectionReturns422 tests that invalid state transitions return 422
func TestConversionRejectionReturns422(t *testing.T) {
	waitForBackend(t)
	cleanupLeads()

	// Create a lead with low score
	leadID, err := createTestLead("Low Score User", "lowscore@example.com", 50, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get current version
	version, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Attempt conversion with insufficient score
	updatePayload := map[string]interface{}{
		"name":       "Low Score User",
		"email":      "lowscore@example.com",
		"lead_score": 50,
		"status":     "CONVERTED",
		"version":    version,
	}

	jsonData, _ := json.Marshal(updatePayload)
	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/leads/%d", backendURL, leadID), bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer response.Body.Close()

	// Read response body once
	bodyBytes, _ := io.ReadAll(response.Body)

	// Should return 422 Unprocessable Entity
	if response.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Expected status 422 Unprocessable Entity, got %d. Body: %s", response.StatusCode, string(bodyBytes))
	}

	// Read and verify error message
	var errorResponse map[string]string
	json.Unmarshal(bodyBytes, &errorResponse)

	if errorMsg, ok := errorResponse["error"]; ok {
		t.Logf("Received expected error message: %s", errorMsg)
	} else {
		t.Error("Expected error message in response")
	}
}

// TestSuccessfulUpdate tests a successful update flow
func TestSuccessfulUpdate(t *testing.T) {
	waitForBackend(t)
	cleanupLeads()

	// Create a test lead
	leadID, err := createTestLead("Success User", "success@example.com", 85, "QUALIFIED")
	if err != nil {
		t.Fatalf("Failed to create test lead: %v", err)
	}

	// Get current version
	version, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}

	// Perform a valid update
	updatePayload := map[string]interface{}{
		"name":       "Success User",
		"email":      "success@example.com",
		"lead_score": 85,
		"status":     "CONVERTED",
		"version":    version,
	}

	jsonData, _ := json.Marshal(updatePayload)
	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/leads/%d", backendURL, leadID), bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer response.Body.Close()

	// Should return 200 OK
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		t.Errorf("Expected status 200 OK, got %d. Body: %s", response.StatusCode, string(body))
	}

	// Verify version incremented
	newVersion, err := getLeadVersion(leadID)
	if err != nil {
		t.Fatalf("Failed to get new version: %v", err)
	}

	if newVersion != version+1 {
		t.Errorf("Expected version to increment from %d to %d, got %d", version, version+1, newVersion)
	}

	t.Logf("Successful update: version incremented from %d to %d", version, newVersion)
}
