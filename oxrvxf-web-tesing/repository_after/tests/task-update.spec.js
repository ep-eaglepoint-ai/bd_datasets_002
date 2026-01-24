const { test, expect } = require('@playwright/test');

test.describe('Task Update', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });
  });

  test('should update task title using page.evaluate()', async ({ page }) => {
    // Create a task
    const createdTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Original title', column: 'todo' });

    // Update the task
    await page.evaluate(({ taskId, newTitle }) => {
      window.updateTask(taskId, newTitle);
    }, { taskId: createdTask.id, newTitle: 'Updated title' });

    // Verify task is updated
    const tasksArray = await page.evaluate(() => window.tasks);
    const updatedTask = tasksArray.find(t => t.id === createdTask.id);
    expect(updatedTask).toBeDefined();
    expect(updatedTask.title).toBe('Updated title');

    // Verify localStorage is updated
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage[0].title).toBe('Updated title');
  });

  test('should trim whitespace when updating', async ({ page }) => {
    const createdTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Original', column: 'todo' });

    await page.evaluate(({ taskId, newTitle }) => {
      window.updateTask(taskId, newTitle);
    }, { taskId: createdTask.id, newTitle: '  Updated with spaces  ' });

    const tasksArray = await page.evaluate(() => window.tasks);
    const updatedTask = tasksArray.find(t => t.id === createdTask.id);
    expect(updatedTask.title).toBe('Updated with spaces');
  });

  test('should not update with empty title', async ({ page }) => {
    const createdTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Original title', column: 'todo' });

    await page.evaluate(({ taskId, newTitle }) => {
      window.updateTask(taskId, newTitle);
    }, { taskId: createdTask.id, newTitle: '   ' });

    const tasksArray = await page.evaluate(() => window.tasks);
    const updatedTask = tasksArray.find(t => t.id === createdTask.id);
    expect(updatedTask.title).toBe('Original title');
  });

  test('should handle update of non-existent task', async ({ page }) => {
    await page.evaluate(({ taskId, newTitle }) => {
      window.updateTask(taskId, newTitle);
    }, { taskId: 'non-existent-id', newTitle: 'New title' });

    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(0);
  });
});
