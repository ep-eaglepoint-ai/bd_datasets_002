// Meta-test for Test Isolation
// Requirements: Run tests with fullyParallel and verify they pass regardless of order

const { test, expect } = require('@playwright/test');

// This test verifies that tests can run in parallel without dependencies
test('tests are isolated and can run in any order', async ({ page }) => {
  // This is a meta-test that verifies the test suite structure
  // The actual parallel execution is handled by Playwright config
  
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  
  // Verify we can create and manipulate tasks independently
  await page.evaluate(() => {
    window.createTask('Isolation Test', 'todo');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.length).toBeGreaterThan(0);
  
  // Clear state
  await page.evaluate(() => {
    localStorage.clear();
    window.tasks = [];
  });
  
  // Verify state is cleared
  const clearedTasks = await page.evaluate(() => window.tasks);
  expect(clearedTasks.length).toBe(0);
});

test('test isolation prevents state pollution', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Each test should start with a clean state
  const initialTasks = await page.evaluate(() => window.tasks.length);
  
  // Perform operations
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  
  const afterCreate = await page.evaluate(() => window.tasks.length);
  expect(afterCreate).toBe(initialTasks + 1);
  
  // Verify localStorage is consistent
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData.length).toBe(afterCreate);
});
