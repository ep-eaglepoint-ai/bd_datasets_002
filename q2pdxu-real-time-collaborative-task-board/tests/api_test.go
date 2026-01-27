package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func getBaseURL() string {
	if url := os.Getenv("API_URL"); url != "" {
		return url
	}
	return "http://localhost:8080"
}

func getWSURL() string {
	if url := os.Getenv("API_URL"); url != "" {
		return "ws" + url[4:] // Replace http with ws
	}
	return "ws://localhost:8080"
}

var (
	baseURL = getBaseURL()
	wsURL   = getWSURL()
)

// ============================================================================
// Helper Types
// ============================================================================

type AuthResponse struct {
	Token string `json:"token"`
}

type BoardResponse struct {
	ID int `json:"id"`
}

type BoardsResponse struct {
	Boards []Board `json:"boards"`
}

type Board struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	OwnerID   int    `json:"owner_id"`
	CreatedAt string `json:"created_at"`
}

type BoardDetailResponse struct {
	Columns []Column `json:"columns"`
	Tasks   []Task   `json:"tasks"`
}

type Column struct {
	ID       int    `json:"id"`
	BoardID  int    `json:"board_id"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type Task struct {
	ID          int    `json:"id"`
	ColumnID    int    `json:"column_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Position    int    `json:"position"`
}

type WSMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ============================================================================
// Helper Functions
// ============================================================================

func generateUniqueEmail() string {
	return fmt.Sprintf("test_%d@example.com", time.Now().UnixNano())
}

func registerUser(t *testing.T, email, password string) string {
	body := map[string]string{"email": email, "password": password}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/auth/register", "application/json", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Registration failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var authResp AuthResponse
	json.NewDecoder(resp.Body).Decode(&authResp)
	return authResp.Token
}

func loginUser(t *testing.T, email, password string) string {
	body := map[string]string{"email": email, "password": password}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var authResp AuthResponse
	json.NewDecoder(resp.Body).Decode(&authResp)
	return authResp.Token
}

func authRequest(method, url, token string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		bodyReader = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	return http.DefaultClient.Do(req)
}

// ============================================================================
// Authentication Tests
// ============================================================================

func TestRegister_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")
	assert.NotEmpty(t, token, "Token should not be empty")
}

func TestRegister_DuplicateEmail(t *testing.T) {
	email := generateUniqueEmail()
	registerUser(t, email, "password123")

	// Try to register with the same email
	body := map[string]string{"email": email, "password": "password456"}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/auth/register", "application/json", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestLogin_Success(t *testing.T) {
	email := generateUniqueEmail()
	registerUser(t, email, "password123")

	token := loginUser(t, email, "password123")
	assert.NotEmpty(t, token)
}

func TestLogin_InvalidCredentials(t *testing.T) {
	body := map[string]string{"email": "nonexistent@example.com", "password": "wrong"}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestProtectedEndpoint_NoToken(t *testing.T) {
	resp, err := http.Get(baseURL + "/api/boards")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestProtectedEndpoint_InvalidToken(t *testing.T) {
	req, _ := http.NewRequest("GET", baseURL+"/api/boards", nil)
	req.Header.Set("Authorization", "Bearer invalid_token")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

// ============================================================================
// Board Tests
// ============================================================================

func TestCreateBoard_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	resp, err := authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "My Test Board"})
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var boardResp BoardResponse
	json.NewDecoder(resp.Body).Decode(&boardResp)
	assert.Greater(t, boardResp.ID, 0)
}

func TestGetBoards_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	// Create a board
	authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "Board 1"})

	resp, err := authRequest("GET", baseURL+"/api/boards", token, nil)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var boardsResp BoardsResponse
	json.NewDecoder(resp.Body).Decode(&boardsResp)
	assert.GreaterOrEqual(t, len(boardsResp.Boards), 1)
}

func TestGetBoard_HasDefaultColumns(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	// Create a board
	resp, _ := authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "Board with Columns"})
	var boardResp BoardResponse
	json.NewDecoder(resp.Body).Decode(&boardResp)
	resp.Body.Close()

	// Get board details
	resp, err := authRequest("GET", fmt.Sprintf("%s/api/boards/%d", baseURL, boardResp.ID), token, nil)
	require.NoError(t, err)
	defer resp.Body.Close()

	var boardDetail BoardDetailResponse
	json.NewDecoder(resp.Body).Decode(&boardDetail)

	assert.Len(t, boardDetail.Columns, 3)
	columnNames := []string{}
	for _, col := range boardDetail.Columns {
		columnNames = append(columnNames, col.Name)
	}
	assert.Contains(t, columnNames, "To Do")
	assert.Contains(t, columnNames, "In Progress")
	assert.Contains(t, columnNames, "Done")
}

// ============================================================================
// Task Tests
// ============================================================================

func TestCreateTask_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	// Create a board
	resp, _ := authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "Task Board"})
	var boardResp BoardResponse
	json.NewDecoder(resp.Body).Decode(&boardResp)
	resp.Body.Close()

	// Get columns
	resp, _ = authRequest("GET", fmt.Sprintf("%s/api/boards/%d", baseURL, boardResp.ID), token, nil)
	var boardDetail BoardDetailResponse
	json.NewDecoder(resp.Body).Decode(&boardDetail)
	resp.Body.Close()

	columnID := boardDetail.Columns[0].ID

	// Create a task
	taskBody := map[string]interface{}{
		"column_id":   columnID,
		"title":       "Test Task",
		"description": "Task description",
	}
	resp, err := authRequest("POST", fmt.Sprintf("%s/api/boards/%d/tasks", baseURL, boardResp.ID), token, taskBody)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var task Task
	json.NewDecoder(resp.Body).Decode(&task)
	assert.Equal(t, "Test Task", task.Title)
	assert.Equal(t, columnID, task.ColumnID)
}

func TestDeleteTask_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	// Create board and get column
	resp, _ := authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "Delete Task Board"})
	var boardResp BoardResponse
	json.NewDecoder(resp.Body).Decode(&boardResp)
	resp.Body.Close()

	resp, _ = authRequest("GET", fmt.Sprintf("%s/api/boards/%d", baseURL, boardResp.ID), token, nil)
	var boardDetail BoardDetailResponse
	json.NewDecoder(resp.Body).Decode(&boardDetail)
	resp.Body.Close()

	// Create a task
	taskBody := map[string]interface{}{
		"column_id": boardDetail.Columns[0].ID,
		"title":     "Task to Delete",
	}
	resp, _ = authRequest("POST", fmt.Sprintf("%s/api/boards/%d/tasks", baseURL, boardResp.ID), token, taskBody)
	var task Task
	json.NewDecoder(resp.Body).Decode(&task)
	resp.Body.Close()

	// Delete the task
	resp, err := authRequest("DELETE", fmt.Sprintf("%s/api/tasks/%d", baseURL, task.ID), token, nil)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestMoveTask_Success(t *testing.T) {
	email := generateUniqueEmail()
	token := registerUser(t, email, "password123")

	// Create board
	resp, _ := authRequest("POST", baseURL+"/api/boards", token, map[string]string{"name": "Move Task Board"})
	var boardResp BoardResponse
	json.NewDecoder(resp.Body).Decode(&boardResp)
	resp.Body.Close()

	// Get columns
	resp, _ = authRequest("GET", fmt.Sprintf("%s/api/boards/%d", baseURL, boardResp.ID), token, nil)
	var boardDetail BoardDetailResponse
	json.NewDecoder(resp.Body).Decode(&boardDetail)
	resp.Body.Close()

	// Create a task in first column
	taskBody := map[string]interface{}{
		"column_id": boardDetail.Columns[0].ID,
		"title":     "Movable Task",
	}
	resp, _ = authRequest("POST", fmt.Sprintf("%s/api/boards/%d/tasks", baseURL, boardResp.ID), token, taskBody)
	var task Task
	json.NewDecoder(resp.Body).Decode(&task)
	resp.Body.Close()

	// Move task to second column
	secondColumnID := boardDetail.Columns[1].ID
	moveBody := map[string]interface{}{
		"column_id": secondColumnID,
		"position":  0,
	}
	resp, err := authRequest("PUT", fmt.Sprintf("%s/api/tasks/%d/move", baseURL, task.ID), token, moveBody)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var movedTask Task
	json.NewDecoder(resp.Body).Decode(&movedTask)
	assert.Equal(t, secondColumnID, movedTask.ColumnID)
}


// ============================================================================
// End of Tests
// ============================================================================
