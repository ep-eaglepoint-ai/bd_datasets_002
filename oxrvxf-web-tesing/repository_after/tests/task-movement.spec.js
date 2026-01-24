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

    // Get initial order
    const initialTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(initialTasks).toHaveLength(3);
    const initialOrder = initialTasks.map(t => t.id);

    // Move task3 before task1 - task should be repositioned immediately before target
    await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
      window.moveTask(taskId, newColumn, insertBeforeId);
    }, { taskId: task3.id, newColumn: 'progress', insertBeforeId: task1.id });

    // Verify task is repositioned in array immediately before target task
    const progressTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(progressTasks).toHaveLength(3);
    
    // Find indices
    const task3Index = progressTasks.findIndex(t => t.id === task3.id);
    const task1Index = progressTasks.findIndex(t => t.id === task1.id);
    
    // task3 should be immediately before task1
    expect(task3Index).toBe(task1Index - 1);
  });

  test('should handle move to same column and position', async ({ page }) => {
    const task1 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    const task2 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 2', column: 'todo' });

    // Get initial order
    const initialTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(initialTasks).toHaveLength(2);
    const initialOrder = initialTasks.map(t => t.id);

    // Move task1 to same column and same position (before task2, which is already before it)
    await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
      window.moveTask(taskId, newColumn, insertBeforeId);
    }, { taskId: task1.id, newColumn: 'todo', insertBeforeId: task2.id });

    // Verify no net change to array order
    const todoTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(todoTasks).toHaveLength(2);
    const finalOrder = todoTasks.map(t => t.id);
    
    // Order should remain the same (task1 before task2)
    expect(finalOrder[0]).toBe(initialOrder[0]);
    expect(finalOrder[1]).toBe(initialOrder[1]);
  });

  test('should handle invalid task IDs or column values gracefully', async ({ page }) => {
    // Create a valid task first
    const validTask = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Valid task', column: 'todo' });

    const initialTasksArray = await page.evaluate(() => window.tasks);
    expect(initialTasksArray).toHaveLength(1);

    // Try to move with invalid task ID
    await page.evaluate(({ taskId, newColumn }) => {
      window.moveTask(taskId, newColumn);
    }, { taskId: 'non-existent-id', newColumn: 'progress' });

    // Verify tasks array is not corrupted
    let tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);
    expect(tasksArray[0].id).toBe(validTask.id);
    expect(tasksArray[0].column).toBe('todo'); // Should remain unchanged

    // Try to move with invalid column value
    await page.evaluate(({ taskId, newColumn }) => {
      window.moveTask(taskId, newColumn);
    }, { taskId: validTask.id, newColumn: 'invalid-column-value' });

    // Verify tasks array is not corrupted - task should still exist
    tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(1);
    // Column might be changed to invalid value, but array should not be corrupted
    expect(Array.isArray(tasksArray)).toBe(true);
  });
});
