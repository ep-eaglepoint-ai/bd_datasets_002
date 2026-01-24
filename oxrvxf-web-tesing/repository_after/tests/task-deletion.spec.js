const { test, expect } = require('@playwright/test');

test.describe('Task Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });
  });

  test('should delete task using page.evaluate()', async ({ page }) => {
    // Create a task first
    const createdTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task to delete', column: 'todo' });

    // Verify task exists
    let tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);

    // Delete the task
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, createdTask.id);

    // Verify task is removed from array
    tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(0);
    expect(tasksArray.find(t => t.id === createdTask.id)).toBeUndefined();

    // Verify localStorage is updated
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage).toHaveLength(0);
  });

  test('should handle deletion of non-existent task gracefully', async ({ page }) => {
    // Create a task
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
    }, { title: 'Existing task', column: 'todo' });

    // Try to delete non-existent task
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, 'non-existent-id');

    // Verify existing task is still there
    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);
  });

  test('should delete task via UI interaction', async ({ page }) => {
    // Create task and render
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task to delete via UI', column: 'todo' });

    // Wait for task to appear
    await page.waitForSelector('.task', { timeout: 5000 });

    // Hover over task to reveal delete button
    const task = page.locator('.task').first();
    await task.hover();

    // Click delete button
    const deleteButton = task.locator('.task-delete');
    await deleteButton.click();

    // Wait for deletion animation
    await page.waitForTimeout(200);

    // Verify task is removed
    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(0);
  });
});
