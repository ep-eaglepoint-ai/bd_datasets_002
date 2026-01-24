// Task Creation Tests
// Requirements: Use page.evaluate() to call createTask and verify task object properties

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('creates task with valid title and column using page.evaluate', async ({ page }) => {
  const title = 'Test Task';
  const column = 'todo';
  
  const task = await page.evaluate(({ title, column }) => {
    return window.createTask(title, column);
  }, { title, column });
  
  // Verify task object properties
  expect(task).toHaveProperty('id');
  expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
  expect(task.title).toBe(title);
  expect(task.column).toBe(column);
  
  // Verify task was appended to tasks array
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toEqual(task);
  
  // Verify localStorage contains the task
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(1);
  expect(storageData[0].id).toBe(task.id);
  expect(storageData[0].title).toBe(title);
  expect(storageData[0].column).toBe(column);
});

test('creates task with trimmed title', async ({ page }) => {
  const title = '  Test Task with Spaces  ';
  const column = 'progress';
  
  const task = await page.evaluate(({ title, column }) => {
    return window.createTask(title, column);
  }, { title, column });
  
  expect(task.title).toBe('Test Task with Spaces');
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks[0].title).toBe('Test Task with Spaces');
});

test('creates multiple tasks with unique IDs', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const task1 = window.createTask('Task 1', 'todo');
    const task2 = window.createTask('Task 2', 'todo');
    const task3 = window.createTask('Task 3', 'progress');
    return [task1, task2, task3];
  });
  
  expect(tasks).toHaveLength(3);
  expect(tasks[0].id).not.toBe(tasks[1].id);
  expect(tasks[1].id).not.toBe(tasks[2].id);
  expect(tasks[0].id).not.toBe(tasks[2].id);
  
  const allTasks = await page.evaluate(() => window.tasks);
  expect(allTasks).toHaveLength(3);
});

test('creates task in different columns', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Todo Task', 'todo');
    window.createTask('Progress Task', 'progress');
    window.createTask('Done Task', 'done');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks).toHaveLength(3);
  expect(tasks.find(t => t.column === 'todo')?.title).toBe('Todo Task');
  expect(tasks.find(t => t.column === 'progress')?.title).toBe('Progress Task');
  expect(tasks.find(t => t.column === 'done')?.title).toBe('Done Task');
});

test('task ID matches pattern task-timestamp-random', async ({ page }) => {
  const task = await page.evaluate(() => {
    return window.createTask('Test', 'todo');
  });
  
  const idPattern = /^task-\d+-[a-z0-9]+$/;
  expect(task.id).toMatch(idPattern);
  
  // Verify timestamp is recent (within last 5 seconds)
  const timestamp = parseInt(task.id.split('-')[1]);
  const now = Date.now();
  expect(now - timestamp).toBeLessThan(5000);
});
