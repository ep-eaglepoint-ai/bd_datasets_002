// Inline Editing Tests
// Requirement 7: Inline editing tests must use page.locator('.task').dblclick() to trigger edit mode and verify 
// the task has the editing class and the input is visible and pre-filled with the current title, must use 
// page.fill() to change the text and page.keyboard.press('Enter') to save then verify both the DOM text content 
// and the tasks array via page.evaluate() reflect the new title, must verify that page.keyboard.press('Escape') 
// reverts to the original title without saving, must verify that page.locator('.task-edit-input').blur() saves 
// changes, and must test that attempting to save an empty string preserves the original title in both the DOM and 
// the data layer.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('triggers edit mode with dblclick, saves with Enter, reverts with Escape, saves with blur, and preserves original title for empty string', async ({ page }) => {
  // Clear all default tasks first
  await page.evaluate(() => {
    window.tasks = [];
    window.saveState();
  });
  await page.reload();
  
  // Create the test task
  await page.evaluate(() => {
    window.createTask('Original Title', 'todo');
  });
  await page.reload();
  
  // Select task by text content to ensure we get the right one
  const task = page.locator('.task').filter({ hasText: 'Original Title' });
  
  // Use page.locator('.task').dblclick() to trigger edit mode
  await task.dblclick();
  
  // Verify task has editing class
  await expect(task).toHaveClass(/editing/);
  
  // Verify input is visible and pre-filled with current title
  const editInput = task.locator('.task-edit-input');
  await expect(editInput).toBeVisible();
  const inputValue = await editInput.inputValue();
  expect(inputValue).toBe('Original Title');
  
  // Use page.fill() to change text and page.keyboard.press('Enter') to save
  await editInput.fill('Updated Title');
  await editInput.press('Enter');
  
  // Verify both DOM text content and tasks array via page.evaluate() reflect new title
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText('Updated Title');
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Updated Title')).toBeDefined();
  expect(tasks.find(t => t.title === 'Original Title')).toBeUndefined();
  
  // Verify that page.keyboard.press('Escape') reverts to original title without saving
  // Re-select task after update to get fresh element reference
  const taskUpdated = page.locator('.task').filter({ hasText: 'Updated Title' });
  await taskUpdated.dblclick();
  const editInputEscape = taskUpdated.locator('.task-edit-input');
  await editInputEscape.fill('Changed Title');
  await editInputEscape.press('Escape');
  
  await expect(taskUpdated).not.toHaveClass(/editing/);
  const taskTitleEscape = taskUpdated.locator('.task-title');
  await expect(taskTitleEscape).toHaveText('Updated Title'); // Should still be Updated Title from previous save
  
  // Reset for blur test
  await page.evaluate(() => {
    const tasks = window.tasks;
    const task = tasks.find(t => t.title === 'Updated Title');
    if (task) task.title = 'Blur Test Title';
    window.saveState();
  });
  await page.reload();
  
  // Select task by text content
  const task2 = page.locator('.task').filter({ hasText: 'Blur Test Title' });
  await task2.dblclick();
  const editInput2 = task2.locator('.task-edit-input');
  
  // Verify that page.locator('.task-edit-input').blur() saves changes
  await editInput2.fill('Blur Saved Title');
  await editInput2.blur();
  await page.waitForTimeout(100);
  
  const taskTitle2 = task2.locator('.task-title');
  await expect(taskTitle2).toHaveText('Blur Saved Title');
  
  const tasks2 = await page.evaluate(() => window.tasks);
  expect(tasks2.find(t => t.title === 'Blur Saved Title')).toBeDefined();
  
  // Test that attempting to save empty string preserves original title in both DOM and data layer
  // Re-select task after blur to ensure we have the updated element
  const task2Updated = page.locator('.task').filter({ hasText: 'Blur Saved Title' });
  await task2Updated.dblclick();
  const editInput3 = task2Updated.locator('.task-edit-input');
  await editInput3.fill('');
  await editInput3.press('Enter');
  
  // Verify original title preserved in DOM
  const taskTitle3 = task2Updated.locator('.task-title');
  await expect(taskTitle3).toHaveText('Blur Saved Title');
  
  // Verify original title preserved in data layer
  const tasks3 = await page.evaluate(() => window.tasks);
  const taskObj = tasks3.find(t => t.title === 'Blur Saved Title');
  expect(taskObj).toBeDefined();
  expect(taskObj.title).toBe('Blur Saved Title');
});
