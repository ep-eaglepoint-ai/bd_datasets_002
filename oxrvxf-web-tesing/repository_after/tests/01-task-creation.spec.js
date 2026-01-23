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

test('creates task with valid title and column using page.evaluate', async ({ page }) => {
  const title = 'Test Task';
  const column = 'todo';
  
  const task = await page.evaluate(({ title, column }) => {
    return window.createTask(title, column);
  }, { title, column });
  
  // Verify task object structure
  expect(task).toHaveProperty('id');
  expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
  expect(task.title).toBe(title);
  expect(task.column).toBe(column);
  
  // Verify task was appended to global tasks array
  const tasks = await page.evaluate(() => window.tasks);
  const ourTask = tasks.find(t => t.id === task.id);
  expect(ourTask).toBeDefined();
  expect(ourTask.title).toBe(title);
  expect(ourTask.column).toBe(column);
  
  // Verify localStorage contains the updated state
  const stored = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  const ourStored = stored.find(t => t.id === task.id);
  expect(ourStored).toBeDefined();
  expect(ourStored.id).toBe(task.id);
});
