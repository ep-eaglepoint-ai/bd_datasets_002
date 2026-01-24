// Inline Editing Tests
// Requirements: Test double-click editing, save, cancel, and empty string handling

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('double-click triggers edit mode', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  // Verify editing class is added
  await expect(task).toHaveClass(/editing/);
  
  // Verify input is visible
  const editInput = task.locator('.task-edit-input');
  await expect(editInput).toBeVisible();
  
  // Verify input is pre-filled with current title
  const inputValue = await editInput.inputValue();
  expect(inputValue).toBe('Test Task');
});

test('saves changes on Enter key', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('Updated Title');
  await editInput.press('Enter');
  
  // Verify editing class is removed
  await expect(task).not.toHaveClass(/editing/);
  
  // Verify DOM text content updated
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Updated Title');
  
  // Verify tasks array updated
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Updated Title')).toBeDefined();
  expect(tasks.find(t => t.title === 'Original Title')).toBeUndefined();
});

test('Escape key reverts to original title', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('Changed Title');
  await editInput.press('Escape');
  
  // Verify editing class removed
  await expect(task).not.toHaveClass(/editing/);
  
  // Verify original title preserved in DOM
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Original Title');
  
  // Verify tasks array unchanged
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Original Title')).toBeDefined();
  expect(tasks.find(t => t.title === 'Changed Title')).toBeUndefined();
});

test('blur event saves changes', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('Blur Saved Title');
  await editInput.blur();
  
  // Wait for blur to process
  await page.waitForTimeout(100);
  
  // Verify changes saved
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Blur Saved Title');
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Blur Saved Title')).toBeDefined();
});

test('empty string preserves original title', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('');
  await editInput.press('Enter');
  
  // Verify original title preserved in DOM
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Original Title');
  
  // Verify tasks array unchanged
  const tasks = await page.evaluate(() => window.tasks);
  const taskObj = tasks.find(t => t.title === 'Original Title');
  expect(taskObj).toBeDefined();
  expect(taskObj.title).toBe('Original Title');
});

test('whitespace-only string preserves original title', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('   ');
  await editInput.press('Enter');
  
  // Verify original title preserved
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Original Title');
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Original Title')).toBeDefined();
});

test('editing updates localStorage', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('.task').first();
  await task.dblclick();
  
  const editInput = task.locator('.task-edit-input');
  await editInput.fill('Updated Task');
  await editInput.press('Enter');
  
  await page.waitForTimeout(100);
  
  // Verify localStorage updated
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData.find(t => t.title === 'Updated Task')).toBeDefined();
  expect(storageData.find(t => t.title === 'Test Task')).toBeUndefined();
});
