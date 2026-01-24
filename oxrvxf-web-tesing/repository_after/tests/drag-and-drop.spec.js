// Drag-and-Drop Tests
// Requirements: Use page.locator().dragTo() and verify DOM and state

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('drags task from one column to another using dragTo', async ({ page }) => {
  // Create tasks
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
  });
  
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks');
  
  // Verify initial state
  await expect(todoTasks).toHaveCount(2);
  
  // Drag first task to progress column
  await todoTasks.first().dragTo(progressTasks);
  
  // Wait for DOM update
  await page.waitForTimeout(200);
  
  // Verify task now exists in target column
  const taskInProgress = progressTasks.locator('.task').filter({ hasText: 'Task 1' });
  await expect(taskInProgress).toBeVisible();
  
  // Verify task removed from source column
  await expect(todoTasks).toHaveCount(1);
  
  // Verify tasks array reflects new column
  const tasks = await page.evaluate(() => window.tasks);
  const movedTask = tasks.find(t => t.title === 'Task 1');
  expect(movedTask.column).toBe('progress');
});

test('drag operation cleans up visual drag states', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const progressColumn = page.locator('#progress-tasks');
  
  // Perform drag
  await task.dragTo(progressColumn);
  await page.waitForTimeout(300);
  
  // Verify dragging class is removed
  await expect(task).not.toHaveClass(/dragging/);
  
  // Verify drag-over class is removed from columns
  const todoColumn = page.locator('[data-column="todo"]');
  const progressColumnElement = page.locator('[data-column="progress"]');
  
  await expect(todoColumn).not.toHaveClass(/drag-over/);
  await expect(progressColumnElement).not.toHaveClass(/drag-over/);
});

test('drags task within same column', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'todo');
  });
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks');
  const tasks = todoTasks.locator('.task');
  
  await expect(tasks).toHaveCount(3);
  
  // Drag first task to end
  const firstTask = tasks.first();
  await firstTask.dragTo(todoTasks);
  
  await page.waitForTimeout(200);
  
  // Verify all tasks still in todo column
  await expect(tasks).toHaveCount(3);
  
  // Verify tasks array still has all tasks
  const tasksArray = await page.evaluate(() => window.tasks);
  const todoTasksArray = tasksArray.filter(t => t.column === 'todo');
  expect(todoTasksArray).toHaveLength(3);
});

test('drag updates localStorage after drop', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const doneTasks = page.locator('#done-tasks');
  
  // Get initial localStorage
  const initialStorage = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(initialStorage[0].column).toBe('todo');
  
  // Drag to done column
  await task.dragTo(doneTasks);
  await page.waitForTimeout(200);
  
  // Verify localStorage updated
  const finalStorage = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(finalStorage[0].column).toBe('done');
});

test('multiple drag operations maintain state consistency', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'progress');
  });
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks');
  const progressTasks = page.locator('#progress-tasks');
  const doneTasks = page.locator('#done-tasks');
  
  // Drag task 1 to progress
  await todoTasks.locator('.task').filter({ hasText: 'Task 1' }).dragTo(progressTasks);
  await page.waitForTimeout(200);
  
  // Drag task 2 to done
  await todoTasks.locator('.task').filter({ hasText: 'Task 2' }).dragTo(doneTasks);
  await page.waitForTimeout(200);
  
  // Verify final state
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Task 1')?.column).toBe('progress');
  expect(tasks.find(t => t.title === 'Task 2')?.column).toBe('done');
  expect(tasks.find(t => t.title === 'Task 3')?.column).toBe('progress');
});
