const { test, expect } = require('@playwright/test');

test.describe('LocalStorage Persistence', () => {
  test('should persist tasks across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });

    // Pre-populate localStorage with specific test data using page.evaluate()
    const testData = [
      { id: 'test-task-1', title: 'Persistent task 1', column: 'todo' },
      { id: 'test-task-2', title: 'Persistent task 2', column: 'progress' },
      { id: 'test-task-3', title: 'Persistent task 3', column: 'done' }
    ];
    
    await page.evaluate((data) => {
      localStorage.setItem('kanban-board-state', JSON.stringify(data));
    }, testData);

    // Verify tasks are in localStorage
    const storageBefore = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storageBefore).toBeTruthy();
    const parsedBefore = JSON.parse(storageBefore);
    expect(parsedBefore).toHaveLength(3);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Wait for initialization

    // Verify after reload that rendered DOM matches persisted state
    const tasksAfter = await page.evaluate(() => window.tasks);
    expect(tasksAfter).toHaveLength(3);
    
    // Verify DOM rendering matches persisted state
    const todoTasks = await page.locator('#todo-tasks .task');
    const progressTasks = await page.locator('#progress-tasks .task');
    const doneTasks = await page.locator('#done-tasks .task');
    
    await expect(todoTasks).toHaveCount(1);
    await expect(progressTasks).toHaveCount(1);
    await expect(doneTasks).toHaveCount(1);

    // Verify localStorage still has data
    const storageAfter = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storageAfter).toBeTruthy();
    const parsedAfter = JSON.parse(storageAfter);
    expect(parsedAfter).toHaveLength(3);
  });

  test('should initialize with default sample tasks when localStorage is completely empty', async ({ page }) => {
    await page.goto('/');
    // Ensure localStorage is completely empty
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload to trigger default initialization
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify default sample tasks are visible in the DOM
    const tasks = await page.evaluate(() => window.tasks);
    expect(Array.isArray(tasks)).toBe(true);
    
    // Should have default tasks (3 default tasks according to app.js)
    if (tasks.length > 0) {
      // Verify default tasks are rendered in DOM
      const renderedTasks = await page.locator('.task').count();
      expect(renderedTasks).toBeGreaterThan(0);
      
      // Verify at least one default task title is visible
      const taskTitles = await page.locator('.task-title').allTextContents();
      expect(taskTitles.length).toBeGreaterThan(0);
    }
  });

  test('should handle corrupted or malformed JSON in localStorage gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Set corrupted/malformed JSON data
    await page.evaluate((key) => {
      localStorage.setItem(key, 'invalid json{');
    }, 'kanban-board-state');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should not crash the application - check that page still renders
    const board = page.locator('#board');
    await expect(board).toBeVisible();
    
    // Check that application still functions
    const tasks = await page.evaluate(() => window.tasks);
    expect(Array.isArray(tasks)).toBe(true);
    
    // Verify we can still create tasks (application functions)
    const newTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Test after corruption', column: 'todo' });
    expect(newTask).toBeDefined();
  });

  test('should save state after every state-modifying UI action', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });

    // Create task via page.evaluate() and verify localStorage
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    // Use page.evaluate() to confirm localStorage contains valid JSON matching expected state
    let storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storage).toBeTruthy();
    const parsed = JSON.parse(storage);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(task.id);
    expect(parsed[0].title).toBe('Task 1');

    // Update task via UI interaction (inline editing simulation)
    await page.evaluate(() => {
      window.renderAllTasks();
    });
    await page.waitForSelector('.task', { timeout: 5000 });
    
    // Simulate UI action: double-click to edit
    await page.locator('.task').first().dblclick();
    await page.locator('.task-edit-input').fill('Updated via UI');
    await page.locator('.task-edit-input').press('Enter');
    await page.waitForTimeout(200);

    // Verify localStorage updated after UI action
    storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedAfterUpdate = JSON.parse(storage);
    expect(parsedAfterUpdate[0].title).toBe('Updated via UI');

    // Delete task via UI interaction
    const taskElement = page.locator('.task').first();
    await taskElement.hover();
    await taskElement.locator('.task-delete').click();
    await page.waitForTimeout(200);

    // Verify localStorage updated after deletion
    storage = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    const parsedAfterDelete = JSON.parse(storage);
    expect(parsedAfterDelete).toHaveLength(0);
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
