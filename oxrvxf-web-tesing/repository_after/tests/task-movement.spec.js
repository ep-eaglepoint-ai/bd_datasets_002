// Task Movement Tests
// Requirements: Use page.evaluate() to validate moveTask updates column property

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('moves task to different column using page.evaluate', async ({ page }) => {
  const task = await page.evaluate(() => {
    return window.createTask('Test Task', 'todo');
  });
  
  // Move task to progress column
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: task.id, newColumn: 'progress' });
  
  const tasks = await page.evaluate(() => window.tasks);
  const movedTask = tasks.find(t => t.id === task.id);
  expect(movedTask.column).toBe('progress');
  expect(movedTask.title).toBe('Test Task');
  expect(movedTask.id).toBe(task.id);
});

test('moves task with insertBeforeId repositions in array', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'todo');
    return [t1, t2, t3];
  });
  
  // Move task 1 to be before task 3
  await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
    window.moveTask(taskId, newColumn, insertBeforeId);
  }, { taskId: tasks[0].id, newColumn: 'todo', insertBeforeId: tasks[2].id });
  
  const finalTasks = await page.evaluate(() => window.tasks);
  const task1Index = finalTasks.findIndex(t => t.id === tasks[0].id);
  const task3Index = finalTasks.findIndex(t => t.id === tasks[2].id);
  
  expect(task1Index).toBeLessThan(task3Index);
  expect(task1Index).toBe(task3Index - 1);
});

test('moving task to current column and position results in no net change', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'todo');
    return [t1, t2, t3];
  });
  
  const initialOrder = await page.evaluate(() => {
    return window.tasks.map(t => t.id);
  });
  
  // Move task 2 to its current position (before task 3)
  await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
    window.moveTask(taskId, newColumn, insertBeforeId);
  }, { taskId: tasks[1].id, newColumn: 'todo', insertBeforeId: tasks[2].id });
  
  const finalOrder = await page.evaluate(() => {
    return window.tasks.map(t => t.id);
  });
  
  // Order should remain the same
  expect(finalOrder).toEqual(initialOrder);
});

test('handles invalid task ID gracefully', async ({ page }) => {
  const task = await page.evaluate(() => {
    return window.createTask('Test Task', 'todo');
  });
  
  const initialTasks = await page.evaluate(() => window.tasks);
  expect(initialTasks).toHaveLength(1);
  
  // Try to move non-existent task
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: 'invalid-task-id', newColumn: 'progress' });
  
  // Tasks array should not be corrupted
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(1);
  expect(finalTasks[0].id).toBe(task.id);
  expect(finalTasks[0].column).toBe('todo');
});

test('handles invalid column value gracefully', async ({ page }) => {
  const task = await page.evaluate(() => {
    return window.createTask('Test Task', 'todo');
  });
  
  const initialTasks = await page.evaluate(() => window.tasks);
  expect(initialTasks).toHaveLength(1);
  
  // Try to move to invalid column
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: task.id, newColumn: 'invalid-column' });
  
  // Task should still exist, column might be invalid but array not corrupted
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(1);
  expect(finalTasks[0].id).toBe(task.id);
});

test('moves task between columns with insertBeforeId', async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'progress');
    const t3 = window.createTask('Task 3', 'progress');
    return [t1, t2, t3];
  });
  
  // Move task 1 from todo to progress, before task 2
  await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
    window.moveTask(taskId, newColumn, insertBeforeId);
  }, { taskId: tasks[0].id, newColumn: 'progress', insertBeforeId: tasks[1].id });
  
  const finalTasks = await page.evaluate(() => window.tasks);
  const task1 = finalTasks.find(t => t.id === tasks[0].id);
  expect(task1.column).toBe('progress');
  
  // Verify positioning
  const task1Index = finalTasks.findIndex(t => t.id === tasks[0].id);
  const task2Index = finalTasks.findIndex(t => t.id === tasks[1].id);
  expect(task1Index).toBeLessThan(task2Index);
});
