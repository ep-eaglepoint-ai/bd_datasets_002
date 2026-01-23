import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
  });
  await page.reload();
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
    if (window.saveState) window.saveState();
  });
});

test('persists state across reload and handles corrupted JSON gracefully', async ({ page }) => {
  // Pre-populate localStorage
  const testData = [
    { id: 'task-1', title: 'Persisted Task 1', column: 'todo' },
    { id: 'task-2', title: 'Persisted Task 2', column: 'progress' },
  ];
  await page.evaluate((data) => {
    localStorage.setItem('kanban-board-state', JSON.stringify(data));
  }, testData);
  
  // Reload page
  await page.reload();
  
  // Verify DOM matches persisted state
  await expect(page.locator('[data-id="task-1"]')).toBeVisible();
  await expect(page.locator('[data-id="task-2"]')).toBeVisible();
  
  // Test corrupted JSON handling
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', 'invalid json {');
  });
  
  await page.reload();
  
  // Verify page still renders
  await expect(page.locator('.board')).toBeVisible();
  
  // Verify application functions
  await page.evaluate(() => {
    window.createTask('New Task', 'todo');
  });
  
  // Test empty localStorage initializes with defaults
  await page.evaluate(() => {
    localStorage.removeItem('skip-default-tasks');
    localStorage.removeItem('kanban-board-state');
  });
  await page.reload();
  
  // Verify default tasks are visible
  const tasks = page.locator('.task');
  const count = await tasks.count();
  expect(count).toBeGreaterThan(0);
  
  // Verify localStorage updated after state-modifying action
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  
  const stored = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(Array.isArray(stored)).toBe(true);
  const testTask = stored.find(t => t.title === 'Test Task');
  expect(testTask).toBeDefined();
});
