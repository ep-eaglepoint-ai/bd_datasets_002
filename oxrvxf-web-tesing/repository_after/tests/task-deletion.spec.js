// Task Deletion Tests
// Requirements: Use page.evaluate() to confirm deleteTask removes exactly one task

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('deletes task with valid ID using page.evaluate', async ({ page }) => {
  // Create multiple tasks
  const initialTasks = await page.evaluate(() => {
    const task1 = window.createTask('Task 1', 'todo');
    const task2 = window.createTask('Task 2', 'todo');
    const task3 = window.createTask('Task 3', 'progress');
    return [task1, task2, task3];
  });
  
  const initialCount = await page.evaluate(() => window.tasks.length);
  expect(initialCount).toBe(3);
  
  // Delete one task
  await page.evaluate((taskId) => {
    window.deleteTask(taskId);
  }, initialTasks[1].id);
  
  // Verify exactly one task was removed
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(2);
  
  // Verify other tasks remain untouched
  expect(finalTasks.find(t => t.id === initialTasks[0].id)).toBeDefined();
  expect(finalTasks.find(t => t.id === initialTasks[2].id)).toBeDefined();
  expect(finalTasks.find(t => t.id === initialTasks[1].id)).toBeUndefined();
  
  // Verify task properties are intact
  const remainingTask1 = finalTasks.find(t => t.id === initialTasks[0].id);
  expect(remainingTask1.title).toBe('Task 1');
  expect(remainingTask1.column).toBe('todo');
  
  const remainingTask2 = finalTasks.find(t => t.id === initialTasks[2].id);
  expect(remainingTask2.title).toBe('Task 3');
  expect(remainingTask2.column).toBe('progress');
  
  // Verify localStorage was updated
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(2);
  expect(storageData.find(t => t.id === initialTasks[1].id)).toBeUndefined();
});

test('deleting non-existent task ID does not throw error', async ({ page }) => {
  // Create a task
  const task = await page.evaluate(() => {
    return window.createTask('Test Task', 'todo');
  });
  
  const initialTasks = await page.evaluate(() => window.tasks);
  expect(initialTasks).toHaveLength(1);
  
  // Try to delete non-existent task
  await page.evaluate((nonExistentId) => {
    window.deleteTask(nonExistentId);
  }, 'task-nonexistent-123');
  
  // Verify tasks array was not modified
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(1);
  expect(finalTasks[0].id).toBe(task.id);
  
  // Verify localStorage was still updated (consistency maintained)
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(1);
});

test('deletes all tasks one by one', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'todo');
    return [t1, t2, t3];
  });
  
  // Delete all tasks
  for (const task of tasks) {
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, task.id);
  }
  
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(0);
  
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(0);
});

test('deleting task preserves other task properties', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'progress');
    const t3 = window.createTask('Task 3', 'done');
    return [t1, t2, t3];
  });
  
  // Store original properties
  const originalTask2 = tasks[1];
  
  // Delete task 1
  await page.evaluate((taskId) => {
    window.deleteTask(taskId);
  }, tasks[0].id);
  
  const remainingTasks = await page.evaluate(() => window.tasks);
  expect(remainingTasks).toHaveLength(2);
  
  // Verify task 2 properties are intact
  const task2 = remainingTasks.find(t => t.id === originalTask2.id);
  expect(task2.title).toBe(originalTask2.title);
  expect(task2.column).toBe(originalTask2.column);
  expect(task2.id).toBe(originalTask2.id);
});
