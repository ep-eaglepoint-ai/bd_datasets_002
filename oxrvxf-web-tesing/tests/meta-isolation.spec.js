// Meta-test for Proper Isolation
// Requirement 10: Meta-test for proper isolation must verify that each test file includes a test.beforeEach hook 
// that either navigates to a fresh page or clears localStorage via page.evaluate(() => localStorage.clear()), 
// ensuring that test pollution cannot occur where one test's state affects subsequent tests, and must flag any 
// test file missing this isolation setup.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('every test file includes test.beforeEach hook that navigates to fresh page or clears localStorage', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for test.beforeEach hook
    const hasBeforeEach = /test\.beforeEach\(/.test(content);
    
    if (!hasBeforeEach) {
      issues.push({
        file,
        issue: 'Missing test.beforeEach hook - test pollution may occur'
      });
      continue;
    }
    
    // Check for localStorage.clear() via page.evaluate(() => localStorage.clear())
    const hasLocalStorageClear = /page\.evaluate\([^)]*localStorage\.clear\(\)/.test(content);
    
    // Check for navigation to fresh page (page.goto or page.reload in beforeEach)
    const hasPageNavigation = /page\.goto\(/.test(content);
    const hasPageReload = /page\.reload\(/.test(content);
    
    // Verify that beforeEach contains either localStorage.clear() or page navigation
    if (!hasLocalStorageClear && !hasPageNavigation && !hasPageReload) {
      issues.push({
        file,
        issue: 'test.beforeEach hook does not clear localStorage via page.evaluate(() => localStorage.clear()) or navigate to fresh page'
      });
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Test files missing proper isolation (test pollution may occur):\n${issues.map(i => 
      `  - ${i.file}: ${i.issue}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});
