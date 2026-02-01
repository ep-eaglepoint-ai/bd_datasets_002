import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Test data
const VALID_CSV_CONTENT = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Wilson,bob@example.com,45
`;

const INVALID_CSV_CONTENT = `name,email,age
John Doe,john@example.com,30
,invalid-email,200
Jane Smith,jane@example.com,25
`;

const MISSING_HEADERS_CSV = `name,email
John Doe,john@example.com
Jane Smith,jane@example.com
`;

const CSV_WITH_EMPTY_LINES = `name,email,age
John Doe,john@example.com,30

Jane Smith,jane@example.com,25

Bob Wilson,bob@example.com,45
`;

const CSV_WITH_WHITESPACE = `name,email,age
  John Doe  ,  john@example.com  ,  30  
Jane Smith,jane@example.com,25
`;

const LARGE_CSV_CONTENT = "name,email,age\n" + Array.from({ length: 25 }, (_, i) => `User${i + 1},user${i + 1}@example.com,${20 + ((i + 1) % 50)}`).join("\n");

async function uploadCsvContent(page: Page, content: string, filenamePrefix: string = "test") {
  const tempDir = os.tmpdir();
  const uniqueFilename = `${filenamePrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.csv`;
  const tempPath = path.join(tempDir, uniqueFilename);
  fs.writeFileSync(tempPath, content);


  try {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPath);
    await page.waitForTimeout(500);
  } finally {
    fs.unlinkSync(tempPath);
  }
}

test.describe('Bulk Import Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Requirement 1: CSV upload input accepts .csv files and rejects non-CSV files
  test('csv upload accepts csv', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.csv');

    await uploadCsvContent(page, VALID_CSV_CONTENT);

    const fileInfo = page.locator('.file-info');
    await expect(fileInfo).toBeVisible();
  });

  test('csv upload rejects non-csv', async ({ page }) => {
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(tempPath, 'not a csv file');

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(tempPath);
      await page.waitForTimeout(500);

      const errorAlert = page.locator('.alert-error');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/CSV/i);
    } finally {
      fs.unlinkSync(tempPath);
    }
  });

  // Requirement 2: Header parsing - first row as headers
  test('header parsing', async ({ page }) => {
    await uploadCsvContent(page, VALID_CSV_CONTENT);

    const previewTable = page.locator('#preview-table');
    await expect(previewTable).toBeVisible();

    const headerTexts = await page.locator('#preview-table th').allTextContents();
    const headers = headerTexts.map(h => h.toLowerCase());

    expect(headers).toContain('name');
    expect(headers).toContain('email');
    expect(headers).toContain('age');
  });

  // Requirement 3: Required headers enforced
  test('required headers enforced', async ({ page }) => {
    await uploadCsvContent(page, MISSING_HEADERS_CSV);

    const errorAlert = page.locator('.alert-error');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Missing required headers');
    await expect(errorAlert).toContainText('age');

    const importButton = page.locator('#import-button');
    await expect(importButton).toBeDisabled();
  });

  // Requirement 4: Skip empty lines
  test('skip empty lines', async ({ page }) => {
    await uploadCsvContent(page, CSV_WITH_EMPTY_LINES);

    const totalRows = page.locator('#total-rows');
    await expect(totalRows).toHaveText('3');
  });

  // Requirement 5: Normalize values (trim whitespace)
  test('normalize values', async ({ page }) => {
    await uploadCsvContent(page, CSV_WITH_WHITESPACE);

    const previewTable = page.locator('#preview-table');
    const firstRow = previewTable.locator('tbody tr').first();
    const nameCell = firstRow.locator('td').nth(1);
    
    await expect(nameCell).toHaveText('John Doe');
  });

  // Requirement 6: Row-by-row validation
  test('row validation', async ({ page }) => {
    await uploadCsvContent(page, INVALID_CSV_CONTENT);

    const validRows = page.locator('#valid-rows');
    const invalidRows = page.locator('#invalid-rows');

    await expect(validRows).toHaveText('2');
    await expect(invalidRows).toHaveText('1');
  });

  // Requirement 7: Row error detail with field-level messages
  test('row error detail', async ({ page }) => {
    await uploadCsvContent(page, INVALID_CSV_CONTENT);

    const errorRow = page.locator('tr.error-row');
    await expect(errorRow).toBeVisible();

    const errorList = errorRow.locator('.error-list li');
    const errorTexts = await errorList.allTextContents();
    const errorTextCombined = errorTexts.join(' ');

    // Field: message format check
    expect(errorTextCombined).toContain(':');
  });

  // Requirement 8: Summary metrics displayed
  test('summary metrics', async ({ page }) => {
    await uploadCsvContent(page, VALID_CSV_CONTENT);

    const summary = page.locator('#summary-dashboard');
    await expect(summary).toBeVisible();

    const totalRows = page.locator('#total-rows');
    const validRows = page.locator('#valid-rows');
    const invalidRows = page.locator('#invalid-rows');

    await expect(totalRows).toBeVisible();
    await expect(validRows).toBeVisible();
    await expect(invalidRows).toBeVisible();

    await expect(totalRows).toHaveText('3');
    await expect(validRows).toHaveText('3');
    await expect(invalidRows).toHaveText('0');
  });

  // Requirement 9: Preview table shows first 20 rows
  test('preview table', async ({ page }) => {
    await uploadCsvContent(page, LARGE_CSV_CONTENT);

    const previewContainer = page.locator('#preview-table-container');
    await expect(previewContainer).toBeVisible();
    await expect(previewContainer).toContainText('First 20 Rows');

    const tableRows = page.locator('#preview-table tbody tr');
    await expect(tableRows).toHaveCount(20);

    const statusBadges = page.locator('.status-badge.ok');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('API Endpoint', () => {
    test('api revalidates server side', async ({ request, baseURL }) => {
        const response = await request.post(`${baseURL}/api/import`, {
            data: {
                rows: [
                    { rowNumber: 1, data: { name: "", email: "invalid", age: "abc" } }
                ]
            }
        });

        const result = await response.json();
        expect(result.importedCount).toBe(0);
        expect(result.invalidRows).toHaveLength(1);
    });

    test('api imports valid rows', async ({ request, baseURL }) => {
        const response = await request.post(`${baseURL}/api/import`, {
            data: {
                rows: [
                    { rowNumber: 1, data: { name: "Test User", email: "test@example.com", age: "25" } }
                ]
            }
        });

        const result = await response.json();
        expect(result.importedCount).toBe(1);
        expect(result.invalidRows).toHaveLength(0);
    });
});
