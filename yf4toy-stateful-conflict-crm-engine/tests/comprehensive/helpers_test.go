package comprehensive

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	neturl "net/url"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

var testDB *sql.DB

// TestMain sets up the test database
func TestMain(m *testing.M) {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("=== TestMain: Starting test setup ===")

	var err error

	// Connect to test database
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://crm_user:crm_pass@localhost:5432/crm_db?sslmode=disable"
	}

	log.Printf("Connecting to database: %s", databaseURL)

	testDB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	// Wait for database to be ready
	maxRetries := 60
	for i := 0; i < maxRetries; i++ {
		err = testDB.Ping()
		if err == nil {
			log.Printf("Database connection established")
			break
		}
		log.Printf("Waiting for database... (%d/%d): %v", i+1, maxRetries, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Database not ready after %d retries: %v", maxRetries, err)
	}

	// Initialize schema
	log.Printf("Initializing database schema...")
	initSchema()
	log.Printf("Schema initialized successfully")

	// Run tests
	code := m.Run()

	// Cleanup
	testDB.Close()

	os.Exit(code)
}

// initSchema creates the test schema
func initSchema() {
	query := `
	DROP TABLE IF EXISTS leads;
	CREATE TABLE leads (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		lead_score INTEGER NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
		status VARCHAR(50) NOT NULL CHECK (status IN ('PROSPECT', 'QUALIFIED', 'CONVERTED')),
		version BIGINT NOT NULL DEFAULT 1,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := testDB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}
}

// cleanupLeads removes all leads from the database
func cleanupLeads() {
	if testDB == nil {
		log.Fatal("testDB is nil - TestMain did not initialize properly")
	}
	testDB.Exec("DELETE FROM leads")
}

// createTestLead creates a test lead
func createTestLead(name, email string, score int, status string) (int, error) {
	var id int
	query := `
		INSERT INTO leads (name, email, lead_score, status, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
		RETURNING id
	`
	err := testDB.QueryRow(query, name, email, score, status).Scan(&id)
	return id, err
}

// getLeadVersion returns the current version of a lead
func getLeadVersion(id int) (int64, error) {
	var version int64
	query := `SELECT version FROM leads WHERE id = $1`
	err := testDB.QueryRow(query, id).Scan(&version)
	return version, err
}

// getLead returns a lead by ID
func getLead(id int) (map[string]interface{}, error) {
	var lead = make(map[string]interface{})
	query := `SELECT id, name, email, lead_score, status, version FROM leads WHERE id = $1`

	var leadID int
	var name, email, status string
	var score int
	var version int64

	err := testDB.QueryRow(query, id).Scan(&leadID, &name, &email, &score, &status, &version)
	if err != nil {
		return nil, err
	}

	lead["id"] = leadID
	lead["name"] = name
	lead["email"] = email
	lead["lead_score"] = score
	lead["status"] = status
	lead["version"] = version

	return lead, nil
}

// updateLeadWithVersion performs an optimistic lock update via HTTP API
func updateLeadWithVersion(id int, name, email string, score int, status string, expectedVersion int64) error {
	// Construct the payload
	payload := map[string]interface{}{
		"name":       name,
		"email":      email,
		"lead_score": score,
		"status":     status,
		"version":    expectedVersion,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}

	// Determine backend URL
	url := os.Getenv("BACKEND_URL")
	if url == "" {
		url = "http://localhost:8080"
	}
	// Assuming running in docker compose test-after usually
	// But let's rely on the env var or default

	// Create request
	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/leads/%d", url, id), bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	// Handle response
	switch resp.StatusCode {
	case http.StatusOK:
		return nil
	case http.StatusConflict:
		// 409 Conflict - Optimistic locking failure
		return fmt.Errorf("version mismatch: concurrent modification detected")
	case http.StatusUnprocessableEntity:
		// 422 Validation error
		body, _ := io.ReadAll(resp.Body)
		var errResp map[string]string
		json.Unmarshal(body, &errResp)
		if msg, ok := errResp["error"]; ok {
			return fmt.Errorf("%s", msg)
		}
		return fmt.Errorf("validation failed: %s", string(body))
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
}

// searchLeads performs a search query via HTTP API
func searchLeads(t *testing.T, query string) []map[string]interface{} {
	url := os.Getenv("BACKEND_URL")
	if url == "" {
		url = "http://localhost:8080"
	}

	searchURL := fmt.Sprintf("%s/api/leads/search?q=%s", url, neturl.QueryEscape(query))

	resp, err := http.Get(searchURL)
	if err != nil {
		t.Fatalf("Failed to search leads: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Search returned status %d: %s", resp.StatusCode, string(body))
	}

	var leads []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&leads); err != nil {
		t.Fatalf("Failed to decode search results: %v", err)
	}

	if leads == nil {
		return []map[string]interface{}{}
	}

	return leads
}
