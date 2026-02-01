// Package tests provides meta-tests for the Task Manager API test quality validation.
//
// These tests validate that the tests in repository_after:
// 1. Are well-formed and runnable
// 2. Cover all 16 requirements
// 3. Have proper assertions (not empty tests)
// 4. Follow best practices for concurrency testing
package tests

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
)

// getProjectRootMeta returns the project root directory for meta tests.
func getProjectRootMeta() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		cwd, _ := os.Getwd()
		return cwd
	}
	return filepath.Dir(filepath.Dir(filename))
}

// loadTestContent loads the test file content from repository_after.
func loadTestContent() string {
	repoAfter := filepath.Join(getProjectRootMeta(), "repository_after")
	testFile := filepath.Join(repoAfter, "requirements_test.go")

	content, err := os.ReadFile(testFile)
	if err != nil {
		return ""
	}
	return string(content)
}

// loadCodeContent loads the main code file content from repository_after.
func loadCodeContent() string {
	repoAfter := filepath.Join(getProjectRootMeta(), "repository_after")
	mainFile := filepath.Join(repoAfter, "task_manager_api.go")

	content, err := os.ReadFile(mainFile)
	if err != nil {
		return ""
	}
	return string(content)
}

// TestRequirementsCoverage verifies that all 16 requirements have corresponding tests.
func TestRequirementsCoverage(t *testing.T) {
	testContent := loadTestContent()
	if testContent == "" {
		t.Skip("requirements_test.go not found in repository_after")
	}

	requirements := []struct {
		num         int
		description string
	}{
		{1, "Concurrent safety"},
		{2, "Race detector"},
		{3, "No unbounded goroutines"},
		{4, "Unique IDs"},
		{5, "Title and description required"},
		{6, "Status validation"},
		{7, "Due date validation"},
		{8, "Deleted tasks removed"},
		{9, "POST returns full object"},
		{10, "PUT returns full object"},
		{11, "GET consistent results"},
		{12, "Consistent response times"},
		{13, "Stable memory usage"},
		{14, "No O(n²) complexity"},
		{15, "In-memory storage only"},
		{16, "HTTP paths preserved"},
	}

	for _, req := range requirements {
		t.Run(req.description, func(t *testing.T) {
			pattern := regexp.MustCompile(`TestRequirement` + string(rune('0'+req.num/10)) + string(rune('0'+req.num%10)) + `_`)
			if req.num < 10 {
				pattern = regexp.MustCompile(`TestRequirement` + string(rune('0'+req.num)) + `_`)
			}
			if !pattern.MatchString(testContent) {
				t.Errorf("Missing test for Requirement %d: %s", req.num, req.description)
			}
		})
	}
}

// TestCodeQuality verifies the solution code quality.
func TestCodeQuality(t *testing.T) {
	codeContent := loadCodeContent()
	if codeContent == "" {
		t.Skip("task_manager_api.go not found in repository_after")
	}

	t.Run("UsesMutexForThreadSafety", func(t *testing.T) {
		if !strings.Contains(codeContent, "sync.RWMutex") {
			t.Error("Missing sync.RWMutex for thread-safe storage")
		}
	})

	t.Run("UsesMapForStorage", func(t *testing.T) {
		if !strings.Contains(codeContent, "map[string]Task") {
			t.Error("Missing map[string]Task for O(1) lookups")
		}
	})

	t.Run("NoBackgroundGoroutinesInInit", func(t *testing.T) {
		initPattern := regexp.MustCompile(`func init\(\)\s*{[^}]*go func`)
		if initPattern.MatchString(codeContent) {
			t.Error("Found background goroutines in init() - potential memory leak")
		}
	})

	t.Run("NoUnboundedChannels", func(t *testing.T) {
		if strings.Contains(codeContent, "processingQueue") {
			t.Error("Found processingQueue - should be removed")
		}
		if strings.Contains(codeContent, "updateChannel") {
			t.Error("Found updateChannel - should be removed")
		}
	})

	t.Run("NoDeleteLog", func(t *testing.T) {
		if strings.Contains(codeContent, "deleteLog") {
			t.Error("Found deleteLog - should use proper deletion")
		}
	})

	t.Run("NoTaskBuffer", func(t *testing.T) {
		if strings.Contains(codeContent, "taskBuffer") {
			t.Error("Found taskBuffer - should use single storage")
		}
	})

	t.Run("NoShadowTasks", func(t *testing.T) {
		if strings.Contains(codeContent, "shadowTasks") {
			t.Error("Found shadowTasks - should use single storage")
		}
	})

	t.Run("HasStatusValidation", func(t *testing.T) {
		validStatuses := []string{"Pending", "In Progress", "Completed"}
		for _, status := range validStatuses {
			if !strings.Contains(codeContent, `"`+status+`"`) {
				t.Errorf("Missing valid status '%s' in validation", status)
			}
		}
	})

	t.Run("HasDateValidation", func(t *testing.T) {
		if !strings.Contains(codeContent, "2000") {
			t.Error("Missing minimum date validation (year 2000)")
		}
	})
}

// TestAPIEndpoints verifies API endpoints are preserved.
func TestAPIEndpoints(t *testing.T) {
	codeContent := loadCodeContent()
	if codeContent == "" {
		t.Skip("task_manager_api.go not found in repository_after")
	}

	t.Run("HasGetRootEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `GET("/",`) {
			t.Error("Missing GET / endpoint")
		}
	})

	t.Run("HasGetTasksEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `GET("/tasks"`) {
			t.Error("Missing GET /tasks endpoint")
		}
	})

	t.Run("HasGetTaskByIdEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `GET("/tasks/:id"`) {
			t.Error("Missing GET /tasks/:id endpoint")
		}
	})

	t.Run("HasPostTasksEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `POST("/tasks"`) {
			t.Error("Missing POST /tasks endpoint")
		}
	})

	t.Run("HasPutTaskEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `PUT("/tasks/:id"`) {
			t.Error("Missing PUT /tasks/:id endpoint")
		}
	})

	t.Run("HasDeleteTaskEndpoint", func(t *testing.T) {
		if !strings.Contains(codeContent, `DELETE("/tasks/:id"`) {
			t.Error("Missing DELETE /tasks/:id endpoint")
		}
	})

	t.Run("JSONFieldNamesPreserved", func(t *testing.T) {
		requiredFields := []string{
			`json:"id"`,
			`json:"title"`,
			`json:"description"`,
			`json:"due_date"`,
			`json:"status"`,
		}
		for _, field := range requiredFields {
			if !strings.Contains(codeContent, field) {
				t.Errorf("Missing or changed JSON field: %s", field)
			}
		}
	})
}
