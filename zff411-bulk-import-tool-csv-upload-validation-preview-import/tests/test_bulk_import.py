"""
Test suite for Bulk Import Tool
Tests all 9 requirements using Playwright for browser automation
"""
import pytest
import time
import os
import subprocess
import signal
from typing import Generator
from playwright.sync_api import Page, expect, sync_playwright, Browser, BrowserContext


# Test data
VALID_CSV_CONTENT = """name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Wilson,bob@example.com,45
"""

INVALID_CSV_CONTENT = """name,email,age
John Doe,john@example.com,30
,invalid-email,200
Jane Smith,jane@example.com,25
"""

MISSING_HEADERS_CSV = """name,email
John Doe,john@example.com
Jane Smith,jane@example.com
"""

CSV_WITH_EMPTY_LINES = """name,email,age
John Doe,john@example.com,30

Jane Smith,jane@example.com,25

Bob Wilson,bob@example.com,45
"""

CSV_WITH_WHITESPACE = """name,email,age
  John Doe  ,  john@example.com  ,  30  
Jane Smith,jane@example.com,25
"""

LARGE_CSV_CONTENT = "name,email,age\n" + "\n".join(
    [f"User{i},user{i}@example.com,{20 + (i % 50)}" for i in range(1, 26)]
)


class TestBulkImportTool:
    """Test class for Bulk Import Tool requirements"""
    
    @pytest.fixture(scope="class")
    def browser_context(self) -> Generator[tuple[Browser, BrowserContext], None, None]:
        """Create browser context for tests"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            yield browser, context
            context.close()
            browser.close()
    
    @pytest.fixture
    def page(self, browser_context: tuple[Browser, BrowserContext]) -> Generator[Page, None, None]:
        """Create a new page for each test"""
        _, context = browser_context
        page = context.new_page()
        app_url = os.environ.get("APP_URL", "http://localhost:3000")
        page.goto(app_url)
        page.wait_for_load_state("networkidle")
        yield page
        page.close()
    
    def upload_csv_content(self, page: Page, content: str, filename: str = "test.csv") -> None:
        """Helper method to upload CSV content"""
        # Create a temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(content)
            temp_path = f.name
        
        try:
            # Upload the file
            file_input = page.locator('input[type="file"]')
            file_input.set_input_files(temp_path)
            # Wait for parsing
            page.wait_for_timeout(500)
        finally:
            os.unlink(temp_path)
    
    # Requirement 1: CSV upload input accepts .csv files and rejects non-CSV files
    def test_csv_upload_accepts_csv(self, page: Page):
        """Test that file input accepts .csv files"""
        file_input = page.locator('input[type="file"]')
        assert file_input.get_attribute("accept") == ".csv"
        
        # Upload a valid CSV
        self.upload_csv_content(page, VALID_CSV_CONTENT)
        
        # Check that file info is displayed
        file_info = page.locator('.file-info')
        expect(file_info).to_be_visible()
    
    def test_csv_upload_rejects_non_csv(self, page: Page):
        """Test that non-CSV files show an error"""
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("not a csv file")
            temp_path = f.name
        
        try:
            file_input = page.locator('input[type="file"]')
            file_input.set_input_files(temp_path)
            page.wait_for_timeout(500)
            
            # Check for error message
            error_alert = page.locator('.alert-error')
            expect(error_alert).to_be_visible()
            expect(error_alert).to_contain_text("CSV")
        finally:
            os.unlink(temp_path)
    
    # Requirement 2: Header parsing - first row as headers
    def test_header_parsing(self, page: Page):
        """Test that first row is parsed as headers"""
        self.upload_csv_content(page, VALID_CSV_CONTENT)
        
        # Check preview table has correct headers
        preview_table = page.locator('#preview-table')
        expect(preview_table).to_be_visible()
        
        # Verify headers are present
        headers = page.locator('#preview-table th')
        header_texts = [h.text_content().lower() for h in headers.all()]
        
        assert 'name' in header_texts
        assert 'email' in header_texts
        assert 'age' in header_texts
    
    # Requirement 3: Required headers enforced
    def test_required_headers_enforced(self, page: Page):
        """Test that missing required headers show error and disable import"""
        self.upload_csv_content(page, MISSING_HEADERS_CSV)
        
        # Check for header error
        error_alert = page.locator('.alert-error')
        expect(error_alert).to_be_visible()
        expect(error_alert).to_contain_text("Missing required headers")
        expect(error_alert).to_contain_text("age")
        
        # Check that import button is disabled
        import_button = page.locator('#import-button')
        expect(import_button).to_be_disabled()
    
    # Requirement 4: Skip empty lines
    def test_skip_empty_lines(self, page: Page):
        """Test that blank lines are ignored and don't count as rows"""
        self.upload_csv_content(page, CSV_WITH_EMPTY_LINES)
        
        # Check total rows (should be 3, not 5)
        total_rows = page.locator('#total-rows')
        expect(total_rows).to_have_text("3")
    
    # Requirement 5: Normalize values (trim whitespace)
    def test_normalize_values(self, page: Page):
        """Test that string values are trimmed"""
        self.upload_csv_content(page, CSV_WITH_WHITESPACE)
        
        # Check that the preview table shows trimmed values
        preview_table = page.locator('#preview-table')
        first_row = preview_table.locator('tbody tr').first
        
        # The name should be trimmed
        name_cell = first_row.locator('td').nth(1)
        expect(name_cell).to_have_text("John Doe")  # Not "  John Doe  "
    
    # Requirement 6: Row-by-row validation
    def test_row_validation(self, page: Page):
        """Test that each row is validated independently"""
        self.upload_csv_content(page, INVALID_CSV_CONTENT)
        
        # Check that we have both valid and invalid rows
        valid_rows = page.locator('#valid-rows')
        invalid_rows = page.locator('#invalid-rows')
        
        # 2 valid, 1 invalid (empty name, invalid email, age > 150)
        expect(valid_rows).to_have_text("2")
        expect(invalid_rows).to_have_text("1")
    
    # Requirement 7: Row error detail with field-level messages
    def test_row_error_detail(self, page: Page):
        """Test that invalid rows show row number and field-level errors"""
        self.upload_csv_content(page, INVALID_CSV_CONTENT)
        
        # Find the error row
        error_row = page.locator('tr.error-row')
        expect(error_row).to_be_visible()
        
        # Check for field-level error messages
        error_list = error_row.locator('.error-list li')
        error_texts = [li.text_content() for li in error_list.all()]
        
        # Should contain errors like "email: Invalid email" or "name: Name is required"
        error_text_combined = " ".join(error_texts)
        assert ":" in error_text_combined  # Field: message format
    
    # Requirement 8: Summary metrics displayed
    def test_summary_metrics(self, page: Page):
        """Test that UI displays total, valid, and invalid row counts"""
        self.upload_csv_content(page, VALID_CSV_CONTENT)
        
        # Check summary dashboard is visible
        summary = page.locator('#summary-dashboard')
        expect(summary).to_be_visible()
        
        # Check all metrics are displayed
        total_rows = page.locator('#total-rows')
        valid_rows = page.locator('#valid-rows')
        invalid_rows = page.locator('#invalid-rows')
        
        expect(total_rows).to_be_visible()
        expect(valid_rows).to_be_visible()
        expect(invalid_rows).to_be_visible()
        
        # Verify counts
        expect(total_rows).to_have_text("3")
        expect(valid_rows).to_have_text("3")
        expect(invalid_rows).to_have_text("0")
    
    # Requirement 9: Preview table shows first 20 rows
    def test_preview_table(self, page: Page):
        """Test that preview shows first 20 rows with status column"""
        self.upload_csv_content(page, LARGE_CSV_CONTENT)
        
        # Check preview table is visible
        preview_container = page.locator('#preview-table-container')
        expect(preview_container).to_be_visible()
        expect(preview_container).to_contain_text("First 20 Rows")
        
        # Check that exactly 20 rows are shown
        table_rows = page.locator('#preview-table tbody tr')
        assert table_rows.count() == 20
        
        # Check status column exists and shows OK for valid rows
        status_badges = page.locator('.status-badge.ok')
        assert status_badges.count() > 0


# Additional tests for edge cases and API behavior

class TestAPIEndpoint:
    """Test the /api/import endpoint directly"""
    
    @pytest.fixture(scope="class")
    def browser_context(self) -> Generator[tuple[Browser, BrowserContext], None, None]:
        """Create browser context for tests"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            yield browser, context
            context.close()
            browser.close()
    
    @pytest.fixture
    def page(self, browser_context: tuple[Browser, BrowserContext]) -> Generator[Page, None, None]:
        """Create a new page for each test"""
        _, context = browser_context
        page = context.new_page()
        yield page
        page.close()
    
    def test_api_revalidates_server_side(self, page: Page):
        """Test that API re-validates data server-side"""
        # Send data directly to API with tampered invalid data marked as valid
        app_url = os.environ.get("APP_URL", "http://localhost:3000")
        response = page.request.post(f"{app_url}/api/import", data={
            "rows": [
                {"rowNumber": 1, "data": {"name": "", "email": "invalid", "age": "abc"}}
            ]
        })
        
        result = response.json()
        
        # Should detect invalid row even if client claimed it was valid
        assert result["importedCount"] == 0
        assert len(result["invalidRows"]) == 1
    
    def test_api_imports_valid_rows(self, page: Page):
        """Test that API successfully imports valid rows"""
        app_url = os.environ.get("APP_URL", "http://localhost:3000")
        response = page.request.post(f"{app_url}/api/import", data={
            "rows": [
                {"rowNumber": 1, "data": {"name": "Test User", "email": "test@example.com", "age": "25"}}
            ]
        })
        
        result = response.json()
        
        assert result["importedCount"] == 1
        assert len(result.get("invalidRows", [])) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
