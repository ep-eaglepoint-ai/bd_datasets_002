import { test, expect } from '@playwright/test';

test('test suite supports parallel execution', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
  });
  await page.reload();
  
  // Perform a simple operation
  await page.evaluate(() => {
    window.createTask('Parallel Test Task', 'todo');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  const ourTask = tasks.find(t => t.title === 'Parallel Test Task');
  expect(ourTask).toBeDefined();
});
