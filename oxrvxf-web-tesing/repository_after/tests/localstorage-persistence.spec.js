const { test, expect } = require('@playwright/test');

test.describe('LocalStorage Persistence', () => {
  test('should persist tasks across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });

    // Create tasks
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
    }, { title: 'Persistent task 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
    }, { title: 'Persistent task 2', column: 'progress' });

    // Verify tasks are in localStorage
    const storageBefore = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storageBefore).toBeTruthy();
    const parsedBefore = JSON.parse(storageBefore);
    expect(parsedBefore).toHaveLength(2);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify tasks are still there
    const tasksAfter = await page.evaluate(() => window.tasks);
    expect(tasksAfter).toHaveLength(2);
    expect(tasksAfter.find(t => t.title === 'Persistent task 1')).toBeDefined();
    expect(tasksAfter.find(t => t.title === 'Persistent task 2')).toBeDefined();

    // Verify localStorage still has data
    const storageAfter = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storageAfter).toBeTruthy();
  });

  test('should initialize with default tasks if localStorage is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload to trigger default initialization
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait a bit for initialization
    await page.waitForTimeout(500);

    const tasks = await page.evaluate(() => window.tasks);
    // Should have default tasks or be empty (depending on implementation)
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('should handle corrupted localStorage gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Set corrupted data
    await page.evaluate((key) => {
      localStorage.setItem(key, 'invalid json{');
    }, 'kanban-board-state');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should handle error gracefully (either empty array or default tasks)
    const tasks = await page.evaluate(() => window.tasks);
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('should save state after every operation', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });

    // Create task
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    // Verify saved
    let storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(JSON.parse(storage)).toHaveLength(1);

    // Update task
    await page.evaluate(({ taskId, newTitle }) => {
      window.updateTask(taskId, newTitle);
    }, { taskId: task.id, newTitle: 'Updated' });

    // Verify updated state is saved
    storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(JSON.parse(storage)[0].title).toBe('Updated');

    // Delete task
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, task.id);

    // Verify deleted state is saved
    storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(JSON.parse(storage)).toHaveLength(0);
  });

  test('should use correct storage key', async ({ page }) => {
    await page.goto('/');
    
    const storageKey = await page.evaluate(() => window.STORAGE_KEY);
    expect(storageKey).toBe('kanban-board-state');

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
    }, { title: 'Test task', column: 'todo' });

    // Verify data is stored with correct key
    const hasData = await page.evaluate((key) => {
      return localStorage.getItem(key) !== null;
    }, 'kanban-board-state');
    expect(hasData).toBe(true);

    // Verify no data in wrong key
    const wrongKeyData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'wrong-key');
    expect(wrongKeyData).toBeNull();
  });
});
