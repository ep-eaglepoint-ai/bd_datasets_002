const { test, expect } = require('@playwright/test');

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage and reset state
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should create task using page.evaluate() with strict validation', async ({ page }) => {
    const testTitle = '  Test Task Title  ';
    const testColumn = 'todo';
    
    // Use page.evaluate() to call createTask
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: testTitle, column: testColumn });

    // Verify returned task object structure
    expect(task).toBeDefined();
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title');
    expect(task).toHaveProperty('column');

    // Verify ID is a unique string matching pattern: task-<timestamp><random>
    expect(typeof task.id).toBe('string');
    expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
    
    // Verify title exactly matches trimmed input
    expect(task.title).toBe('Test Task Title');
    expect(task.title).not.toContain('  '); // No leading/trailing spaces
    
    // Verify column matches provided column
    expect(task.column).toBe(testColumn);

    // Verify task was appended to global tasks array via page.evaluate()
    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);
    expect(tasksArray[0].id).toBe(task.id);
    expect(tasksArray[0].title).toBe(task.title);
    expect(tasksArray[0].column).toBe(task.column);

    // Verify localStorage contains updated serialized state
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    
    expect(storageData).toBeTruthy();
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage).toHaveLength(1);
    expect(parsedStorage[0].id).toBe(task.id);
    expect(parsedStorage[0].title).toBe(task.title);
    expect(parsedStorage[0].column).toBe(task.column);

    // Verify correct storage key is used
    const storageKey = await page.evaluate(() => window.STORAGE_KEY);
    expect(storageKey).toBe('kanban-board-state');
  });

  test('should create tasks in different columns', async ({ page }) => {
    const columns = ['todo', 'progress', 'done'];
    
    for (const column of columns) {
      const task = await page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: `Task for ${column}`, column });
      
      expect(task.column).toBe(column);
      expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
    }

    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(3);
    
    const tasksByColumn = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasksByColumn).toHaveLength(1);
  });

  test('should handle empty title by trimming', async ({ page }) => {
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: '   ', column: 'todo' });
    
    expect(task.title).toBe('');
  });

  test('should create unique IDs for multiple tasks', async ({ page }) => {
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      const task = await page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: `Task ${i}`, column: 'todo' });
      tasks.push(task);
    }

    const ids = tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
    
    // Verify all IDs match the pattern
    ids.forEach(id => {
      expect(id).toMatch(/^task-\d+-[a-z0-9]+$/);
    });
  });
});
