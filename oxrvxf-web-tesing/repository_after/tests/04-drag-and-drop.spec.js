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

test('drags task from one column to another using dragTo', async ({ page }) => {
  const taskIds = await page.evaluate(() => {
    const t1 = window.createTask('Task in Todo', 'todo');
    const t2 = window.createTask('Task in Progress', 'progress');
    return { todoId: t1.id, progressId: t2.id };
  });
  await page.reload();
  
  const todoTask = page.locator(`[data-id="${taskIds.todoId}"]`);
  const progressColumn = page.locator('[data-column="progress"] .tasks');
  
  // Perform drag operation
  await todoTask.dragTo(progressColumn);
  await page.waitForTimeout(200);
  
  // Verify task exists in target column DOM
  const taskInProgress = page.locator(`[data-column="progress"] [data-id="${taskIds.todoId}"]`);
  await expect(taskInProgress).toBeVisible();
  
  // Verify tasks array reflects new column
  const tasks = await page.evaluate(() => window.tasks);
  const movedTask = tasks.find(t => t.id === taskIds.todoId);
  expect(movedTask.column).toBe('progress');
  
  // Verify dragging class is removed
  const draggingElements = page.locator('.dragging');
  await expect(draggingElements).toHaveCount(0);
  
  // Verify drag-over class is removed
  const dragOverColumns = page.locator('.column.drag-over');
  await expect(dragOverColumns).toHaveCount(0);
});
