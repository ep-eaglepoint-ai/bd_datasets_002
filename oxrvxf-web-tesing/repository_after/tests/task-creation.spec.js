// Task Creation Tests
// Requirement 1: Task creation tests must use page.evaluate() to call createTask with a valid title and column 
// and verify the returned task object contains a unique string ID matching the pattern "task-" followed by a 
// timestamp and random characters, a title property exactly matching the trimmed input string, and a column 
// property matching the specified column, while also confirming through additional page.evaluate() calls that 
// the task was appended to the global tasks array and that localStorage under the correct key contains the 
// serialized updated state.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('creates task with valid title and column using page.evaluate and verifies task object properties, tasks array, and localStorage', async ({ page }) => {
  const title = 'Test Task';
  const column = 'todo';
  
  // Use page.evaluate() to call createTask
  const task = await page.evaluate(({ title, column }) => {
    return window.createTask(title, column);
  }, { title, column });
  
  // Verify task object properties
  expect(task).toHaveProperty('id');
  expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/); // Pattern: task-timestamp-random
  expect(task.title).toBe(title.trim()); // Exactly matching trimmed input
  expect(task.column).toBe(column); // Matching specified column
  
  // Confirm task was appended to global tasks array via page.evaluate()
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toEqual(task);
  
  // Confirm localStorage contains serialized updated state
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(1);
  expect(storageData[0].id).toBe(task.id);
  expect(storageData[0].title).toBe(title.trim());
  expect(storageData[0].column).toBe(column);
});
