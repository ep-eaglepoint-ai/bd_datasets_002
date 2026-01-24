const { test, expect } = require('@playwright/test');

test.describe('Task Movement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });
  });

  test('should move task between columns using page.evaluate()', async ({ page }) => {
    // Create tasks in different columns
    const todoTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Todo task', column: 'todo' });

    const progressTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Progress task', column: 'progress' });

    // Move todo task to progress
    await page.evaluate(({ taskId, newColumn }) => {
      window.moveTask(taskId, newColumn);
    }, { taskId: todoTask.id, newColumn: 'progress' });

    // Verify movement
    const progressTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(progressTasks).toHaveLength(2);
    expect(progressTasks.find(t => t.id === todoTask.id)).toBeDefined();

    const todoTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(todoTasks).toHaveLength(0);
  });

  test('should move task with insertBeforeId', async ({ page }) => {
    // Create multiple tasks in progress column
    const task1 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'progress' });

    const task2 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 2', column: 'progress' });

    const task3 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 3', column: 'progress' });

    // Move task3 before task1
    await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
      window.moveTask(taskId, newColumn, insertBeforeId);
    }, { taskId: task3.id, newColumn: 'progress', insertBeforeId: task1.id });

    // Verify order
    const progressTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(progressTasks).toHaveLength(3);
    expect(progressTasks[0].id).toBe(task3.id);
    expect(progressTasks[1].id).toBe(task1.id);
    expect(progressTasks[2].id).toBe(task2.id);
  });

  test('should handle move to same column', async ({ page }) => {
    const task1 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    const task2 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 2', column: 'todo' });

    // Move task1 to same column (should be no-op for column change)
    await page.evaluate(({ taskId, newColumn }) => {
      window.moveTask(taskId, newColumn);
    }, { taskId: task1.id, newColumn: 'todo' });

    const todoTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(todoTasks).toHaveLength(2);
  });

  test('should handle move of non-existent task', async ({ page }) => {
    await page.evaluate(({ taskId, newColumn }) => {
      window.moveTask(taskId, newColumn);
    }, { taskId: 'non-existent-id', newColumn: 'progress' });

    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(0);
  });
});
