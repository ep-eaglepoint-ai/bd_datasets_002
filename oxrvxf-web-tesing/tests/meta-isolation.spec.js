// Meta-test for Proper Isolation
// Requirements: Verify each test file has beforeEach hook with isolation

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('every test file includes beforeEach hook for isolation', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for beforeEach hook
    const hasBeforeEach = /test\.beforeEach\(/.test(content);
    
    // Check for localStorage.clear() or page navigation
    const hasLocalStorageClear = /localStorage\.clear\(\)/.test(content);
    const hasPageNavigation = /page\.goto\(/.test(content);
    const hasPageReload = /page\.reload\(/.test(content);
    
    if (!hasBeforeEach) {
      issues.push({
        file,
        issue: 'Missing test.beforeEach hook'
      });
    } else if (!hasLocalStorageClear && !hasPageNavigation) {
      issues.push({
        file,
        issue: 'beforeEach hook does not clear localStorage or navigate to fresh page'
      });
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Test files missing proper isolation:\n${issues.map(i => 
      `  - ${i.file}: ${i.issue}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});

test('meta-test itself has proper isolation', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  expect(true).toBe(true);
});
