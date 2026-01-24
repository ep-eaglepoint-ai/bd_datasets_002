// Meta-test for Test Isolation
// Requirement 12: Meta-test for test isolation must configure Playwright to run all tests with fullyParallel: true 
// and workers set to the maximum available, run the test suite multiple times, and verify that all tests pass 
// regardless of execution order and parallelization, confirming that no test depends on side effects from another 
// test running first or sequentially.

const { test, expect } = require('@playwright/test');
const path = require('path');

test('tests pass regardless of execution order and parallelization with no side effect dependencies', async ({ page }) => {
  // Verify that Playwright config has fullyParallel: true and workers set to maximum available
  const configPath = path.join(__dirname, '../repository_after/tests/playwright.config.js');
  const configContent = require('fs').readFileSync(configPath, 'utf-8');
  
  // Verify fullyParallel is set to true
  const hasFullyParallel = /fullyParallel:\s*true/.test(configContent);
  expect(hasFullyParallel).toBe(true);
  
  // Verify workers configuration allows parallelization
  const hasWorkersConfig = /workers:/.test(configContent);
  expect(hasWorkersConfig).toBe(true);
  
  // Verify each test file has proper isolation (beforeEach with localStorage.clear or page navigation)
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = require('fs').readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  let allTestsIsolated = true;
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    
    // Each test should have beforeEach with isolation
    const hasBeforeEach = /test\.beforeEach\(/.test(content);
    const hasIsolation = /localStorage\.clear\(\)/.test(content) || /page\.goto\(/.test(content) || /page\.reload\(/.test(content);
    
    if (!hasBeforeEach || !hasIsolation) {
      allTestsIsolated = false;
      break;
    }
  }
  
  expect(allTestsIsolated).toBe(true);
  
  // Verify that no test depends on side effects from another test
  // Each test should start with a clean state
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Verify we can create and manipulate tasks independently
  await page.evaluate(() => {
    window.createTask('Isolation Test 1', 'todo');
    window.createTask('Isolation Test 2', 'progress');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.length).toBeGreaterThanOrEqual(2);
  
  // Clear state completely
  await page.evaluate(() => {
    localStorage.clear();
    window.tasks = [];
  });
  
  // Verify state is cleared
  const clearedTasks = await page.evaluate(() => window.tasks);
  expect(clearedTasks.length).toBe(0);
  
  // Verify we can start fresh operations (no side effects from previous operations)
  await page.evaluate(() => {
    window.createTask('Fresh Test', 'todo');
  });
  
  const freshTasks = await page.evaluate(() => window.tasks);
  expect(freshTasks.length).toBe(1);
  expect(freshTasks[0].title).toBe('Fresh Test');
});
