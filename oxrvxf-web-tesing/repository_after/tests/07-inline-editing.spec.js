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

test('double-click triggers edit mode and handles save/cancel properly', async ({ page }) => {
  const taskId = await page.evaluate(() => {
    return window.createTask('Original Title', 'todo').id;
  });
  await page.reload();
  
  const task = page.locator(`[data-id="${taskId}"]`);
  await task.dblclick();
  
  // Verify editing class is added
  await expect(task).toHaveClass(/editing/);
  
  // Verify input is visible and pre-filled
  const editInput = task.locator('.task-edit-input');
  await expect(editInput).toBeVisible();
  const inputValue = await editInput.inputValue();
  expect(inputValue).toBe('Original Title');
  
  // Test saving changes with Enter
  await editInput.fill('Updated Title');
  await page.keyboard.press('Enter');
  
  await expect(task.locator('.task-title')).toHaveText('Updated Title');
  const tasks = await page.evaluate(() => window.tasks);
  const updatedTask = tasks.find(t => t.id === taskId);
  expect(updatedTask.title).toBe('Updated Title');
  
  // Test Escape reverts changes
  await task.dblclick();
  await editInput.fill('Changed Title');
  await page.keyboard.press('Escape');
  await expect(task.locator('.task-title')).toHaveText('Updated Title');
  
  const tasksAfterEscape = await page.evaluate(() => window.tasks);
  const taskAfterEscape = tasksAfterEscape.find(t => t.id === taskId);
  expect(taskAfterEscape.title).toBe('Updated Title');
  
  // Test blur saves changes
  await task.dblclick();
  await editInput.fill('Blur Saved Title');
  await editInput.blur();
  await expect(task.locator('.task-title')).toHaveText('Blur Saved Title');
  
  // Test empty string preserves original
  await task.dblclick();
  await editInput.fill('');
  await page.keyboard.press('Enter');
  await expect(task.locator('.task-title')).toHaveText('Blur Saved Title');
  
  const tasksAfterEmpty = await page.evaluate(() => window.tasks);
  const taskAfterEmpty = tasksAfterEmpty.find(t => t.id === taskId);
  expect(taskAfterEmpty.title).toBe('Blur Saved Title');
});
