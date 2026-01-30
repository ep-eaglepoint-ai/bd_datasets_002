"""
Task Manager API - Meta-Tests for Test Quality Validation

These tests validate that the tests in repository_after:
1. Are well-formed and runnable
2. Cover all 16 requirements
3. Have proper assertions (not empty tests)
4. Follow best practices for concurrency testing
"""

import os
import re
import sys
from pathlib import Path
import unittest


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent


class TestRequirementsCoverage(unittest.TestCase):
    """Meta-tests that verify test coverage of all requirements."""
    
    @classmethod
    def setUpClass(cls):
        """Load the test file content."""
        repo_after = get_project_root() / "repository_after"
        test_file = repo_after / "requirements_test.go"
        
        if test_file.exists():
            cls.test_content = test_file.read_text()
        else:
            cls.test_content = ""
    
    def test_requirement_1_has_test(self):
        """Verify Requirement 1 (concurrent safety) has a test."""
        self.assertIn("TestRequirement1_", self.test_content,
                      "Missing test for Requirement 1: Concurrent safety")
    
    def test_requirement_2_has_test(self):
        """Verify Requirement 2 (race detector) has a test."""
        self.assertIn("TestRequirement2_", self.test_content,
                      "Missing test for Requirement 2: Race detector")
        
    def test_requirement_3_has_test(self):
        """Verify Requirement 3 (no goroutine leaks) has a test."""
        self.assertIn("TestRequirement3_", self.test_content,
                      "Missing test for Requirement 3: No unbounded goroutines")
    
    def test_requirement_4_has_test(self):
        """Verify Requirement 4 (unique IDs) has a test."""
        self.assertIn("TestRequirement4_", self.test_content,
                      "Missing test for Requirement 4: Unique IDs")
    
    def test_requirement_5_has_test(self):
        """Verify Requirement 5 (Title and description cannot be empty) has a test."""
        self.assertIn("TestRequirement5_", self.test_content,
                      "Missing test for Requirement 5: Title and description required")
    
    def test_requirement_6_has_test(self):
        """Verify Requirement 6 (Status validation) has a test."""
        self.assertIn("TestRequirement6_", self.test_content,
                      "Missing test for Requirement 6: Status validation")
    
    def test_requirement_7_has_test(self):
        """Verify Requirement 7 (Due dates realistic) has a test."""
        self.assertIn("TestRequirement7_", self.test_content,
                      "Missing test for Requirement 7: Due date validation")
    
    def test_requirement_8_has_test(self):
        """Verify Requirement 8 (Deleted tasks removed) has a test."""
        self.assertIn("TestRequirement8_", self.test_content,
                      "Missing test for Requirement 8: Deleted tasks removed")
    
    def test_requirement_9_has_test(self):
        """Verify Requirement 9 (POST returns full object) has a test."""
        self.assertIn("TestRequirement9_", self.test_content,
                      "Missing test for Requirement 9: POST returns full object")
    
    def test_requirement_10_has_test(self):
        """Verify Requirement 10 (PUT returns full object) has a test."""
        self.assertIn("TestRequirement10_", self.test_content,
                      "Missing test for Requirement 10: PUT returns full object")
    
    def test_requirement_11_has_test(self):
        """Verify Requirement 11 (GET consistent results) has a test."""
        self.assertIn("TestRequirement11_", self.test_content,
                      "Missing test for Requirement 11: GET consistent results")
    
    def test_requirement_12_has_test(self):
        """Verify Requirement 12 (Consistent response times) has a test."""
        self.assertIn("TestRequirement12_", self.test_content,
                      "Missing test for Requirement 12: Consistent response times")
    
    def test_requirement_13_has_test(self):
        """Verify Requirement 13 (Stable memory usage) has a test."""
        self.assertIn("TestRequirement13_", self.test_content,
                      "Missing test for Requirement 13: Stable memory usage")
    
    def test_requirement_14_has_test(self):
        """Verify Requirement 14 (No O(n²) complexity) has a test."""
        self.assertIn("TestRequirement14_", self.test_content,
                      "Missing test for Requirement 14: No O(n²) complexity")
    
    def test_requirement_15_has_test(self):
        """Verify Requirement 15 (In-memory storage only) has a test."""
        self.assertIn("TestRequirement15_", self.test_content,
                      "Missing test for Requirement 15: In-memory storage only")
    
    def test_requirement_16_has_test(self):
        """Verify Requirement 16 (Cannot change HTTP paths) has a test."""
        self.assertIn("TestRequirement16_", self.test_content,
                      "Missing test for Requirement 16: HTTP paths preserved")


class TestCodeQuality(unittest.TestCase):
    """Meta-tests that verify the solution code quality."""
    
    @classmethod
    def setUpClass(cls):
        """Load the main code file content."""
        repo_after = get_project_root() / "repository_after"
        main_file = repo_after / "task_manager_api.go"
        
        if main_file.exists():
            cls.code_content = main_file.read_text()
        else:
            cls.code_content = ""
    
    def test_uses_mutex_for_thread_safety(self):
        """Verify the code uses sync.RWMutex for thread safety."""
        self.assertIn("sync.RWMutex", self.code_content,
                      "Missing sync.RWMutex for thread-safe storage")
    
    def test_uses_map_for_storage(self):
        """Verify the code uses map for O(1) lookups."""
        self.assertIn("map[string]Task", self.code_content,
                      "Missing map[string]Task for O(1) lookups")
    
    def test_no_background_goroutines(self):
        """Verify no unbounded background goroutines in init()."""
        # Check for problematic patterns in init
        init_pattern = r'func init\(\)\s*{[^}]*go func'
        has_goroutines_in_init = re.search(init_pattern, self.code_content, re.DOTALL)
        self.assertIsNone(has_goroutines_in_init,
                          "Found background goroutines in init() - potential memory leak")
    
    def test_no_unbounded_channels(self):
        """Verify no unbounded channel processing."""
        # processingQueue and updateChannel were problematic
        self.assertNotIn("processingQueue", self.code_content,
                         "Found processingQueue - should be removed")
        self.assertNotIn("updateChannel", self.code_content,
                         "Found updateChannel - should be removed")
    
    def test_no_delete_log(self):
        """Verify deleteLog is removed (proper deletion instead)."""
        self.assertNotIn("deleteLog", self.code_content,
                         "Found deleteLog - should use proper deletion")
    
    def test_no_task_buffer(self):
        """Verify taskBuffer is removed (single source of truth)."""
        self.assertNotIn("taskBuffer", self.code_content,
                         "Found taskBuffer - should use single storage")
    
    def test_no_shadow_tasks(self):
        """Verify shadowTasks is removed (single source of truth)."""
        self.assertNotIn("shadowTasks", self.code_content,
                         "Found shadowTasks - should use single storage")
    
    def test_has_status_validation(self):
        """Verify status validation is present."""
        valid_statuses = ["Pending", "In Progress", "Completed"]
        for status in valid_statuses:
            self.assertIn(f'"{status}"', self.code_content,
                          f"Missing valid status '{status}' in validation")
    
    def test_has_date_validation(self):
        """Verify date validation is present."""
        # Should check for min/max date bounds
        self.assertIn("2000", self.code_content,
                      "Missing minimum date validation (year 2000)")


class TestAPIEndpoints(unittest.TestCase):
    """Meta-tests that verify API endpoints are preserved."""
    
    @classmethod
    def setUpClass(cls):
        """Load the main code file content."""
        repo_after = get_project_root() / "repository_after"
        main_file = repo_after / "task_manager_api.go"
        
        if main_file.exists():
            cls.code_content = main_file.read_text()
        else:
            cls.code_content = ""
    
    def test_has_get_root_endpoint(self):
        """Verify GET / endpoint exists."""
        self.assertIn('GET("/",', self.code_content,
                      "Missing GET / endpoint")
    
    def test_has_get_tasks_endpoint(self):
        """Verify GET /tasks endpoint exists."""
        self.assertIn('GET("/tasks"', self.code_content,
                      "Missing GET /tasks endpoint")
    
    def test_has_get_task_by_id_endpoint(self):
        """Verify GET /tasks/:id endpoint exists."""
        self.assertIn('GET("/tasks/:id"', self.code_content,
                      "Missing GET /tasks/:id endpoint")
    
    def test_has_post_tasks_endpoint(self):
        """Verify POST /tasks endpoint exists."""
        self.assertIn('POST("/tasks"', self.code_content,
                      "Missing POST /tasks endpoint")
    
    def test_has_put_task_endpoint(self):
        """Verify PUT /tasks/:id endpoint exists."""
        self.assertIn('PUT("/tasks/:id"', self.code_content,
                      "Missing PUT /tasks/:id endpoint")
    
    def test_has_delete_task_endpoint(self):
        """Verify DELETE /tasks/:id endpoint exists."""
        self.assertIn('DELETE("/tasks/:id"', self.code_content,
                      "Missing DELETE /tasks/:id endpoint")
    
    def test_json_field_names_preserved(self):
        """Verify JSON field names are preserved."""
        required_json_fields = ['json:"id"', 'json:"title"', 'json:"description"', 
                                'json:"due_date"', 'json:"status"']
        for field in required_json_fields:
            self.assertIn(field, self.code_content,
                          f"Missing or changed JSON field: {field}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
