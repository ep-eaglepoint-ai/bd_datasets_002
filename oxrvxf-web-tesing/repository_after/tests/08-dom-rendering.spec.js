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

test('renders correct number of tasks and displays empty state', async ({ page }) => {
  const taskIds = await page.evaluate(() => {
    const ids = [];
    ids.push(window.createTask('Task 1', 'todo').id);
    ids.push(window.createTask('Task 2', 'todo').id);
    ids.push(window.createTask('Task 3', 'progress').id);
    return ids;
  });
  await page.reload();
  
  // Verify tasks are rendered
  await expect(page.locator(`[data-id="${taskIds[0]}"]`)).toBeVisible();
  await expect(page.locator(`[data-id="${taskIds[1]}"]`)).toBeVisible();
  await expect(page.locator(`[data-id="${taskIds[2]}"]`)).toBeVisible();
  
  // Verify task count badges
  const todoCount = await page.locator('[data-count="todo"]').textContent();
  const progressCount = await page.locator('[data-count="progress"]').textContent();
  expect(parseInt(todoCount)).toBeGreaterThanOrEqual(2);
  expect(parseInt(progressCount)).toBeGreaterThanOrEqual(1);
  
  // Verify empty column shows empty state
  await page.evaluate(() => {
    window.tasks = [];
    window.saveState();
  });
  await page.reload();
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
    if (window.saveState) window.saveState();
  });
  
  const emptyState = page.locator('#todo-tasks .empty-state');
  await expect(emptyState).toBeVisible();
  
  // Verify all task elements have data-id attributes
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  const dataId = await task.getAttribute('data-id');
  expect(dataId).toBeTruthy();
  expect(dataId).toMatch(/^task-/);
});
