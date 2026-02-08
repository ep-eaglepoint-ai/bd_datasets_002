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
    // Create multiple tasks first
    const task1 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    const task2 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 2', column: 'progress' });

    const task3 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 3', column: 'done' });

    // Verify tasks exist
    let tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(3);

    // Store original properties of remaining tasks
    const originalTask2 = { ...task2 };
    const originalTask3 = { ...task3 };

    // Delete task1
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, task1.id);

    // Verify exactly one task was removed
    tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(2);
    expect(tasksArray.find(t => t.id === task1.id)).toBeUndefined();

    // Verify all other tasks untouched with original properties intact
    const remainingTask2 = tasksArray.find(t => t.id === task2.id);
    const remainingTask3 = tasksArray.find(t => t.id === task3.id);
    expect(remainingTask2).toBeDefined();
    expect(remainingTask3).toBeDefined();
    expect(remainingTask2.title).toBe(originalTask2.title);
    expect(remainingTask2.column).toBe(originalTask2.column);
    expect(remainingTask3.title).toBe(originalTask3.title);
    expect(remainingTask3.column).toBe(originalTask3.column);

    // Verify localStorage is updated immediately after removal
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage).toHaveLength(2);
    expect(parsedStorage.find(t => t.id === task1.id)).toBeUndefined();
  });

  test('should handle deletion of non-existent task gracefully', async ({ page }) => {
    // Create a task
    const existingTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Existing task', column: 'todo' });

    // Store original state
    const originalTasksArray = await page.evaluate(() => window.tasks);
    expect(originalTasksArray).toHaveLength(1);

    // Try to delete non-existent task - should not throw error
    let errorThrown = false;
    try {
      await page.evaluate((taskId) => {
        window.deleteTask(taskId);
      }, 'non-existent-id');
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).toBe(false);

    // Verify tasks array is not modified
    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);
    expect(tasksArray[0].id).toBe(existingTask.id);
    expect(tasksArray[0].title).toBe(existingTask.title);
    expect(tasksArray[0].column).toBe(existingTask.column);

    // Verify localStorage is still updated to maintain consistency
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage).toHaveLength(1);
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
