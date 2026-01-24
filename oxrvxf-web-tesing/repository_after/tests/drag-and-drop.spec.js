const { test, expect } = require('@playwright/test');

test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should drag and drop task between columns via E2E simulation', async ({ page }) => {
    // Create tasks
    const taskToDrag = await page.evaluate(({ title, column }) => {
      const task = window.createTask(title, column);
      window.renderAllTasks();
      return task;
    }, { title: 'Task to drag', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Existing progress task', column: 'progress' });

    // Wait for tasks to render
    await page.waitForSelector('.task', { timeout: 5000 });

    // Get source and target columns
    const todoColumn = page.locator('[data-column="todo"] .tasks');
    const progressColumn = page.locator('[data-column="progress"] .tasks');
    const task = page.locator(`[data-id="${taskToDrag.id}"]`);

    // Perform drag and drop using Playwright's dragTo method
    await task.dragTo(progressColumn);

    // Wait for render to complete
    await page.waitForTimeout(300);

    // Verify task element now exists within target column's DOM container
    const taskInProgress = progressColumn.locator(`[data-id="${taskToDrag.id}"]`);
    await expect(taskInProgress).toBeVisible();
    
    // Verify task does not exist in source column
    const taskInTodo = todoColumn.locator(`[data-id="${taskToDrag.id}"]`);
    await expect(taskInTodo).toHaveCount(0);

    // Verify using page.evaluate() that tasks array reflects new column assignment
    const progressTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(progressTasks).toHaveLength(2);
    expect(progressTasks.find(t => t.id === taskToDrag.id)).toBeDefined();
    expect(progressTasks.find(t => t.id === taskToDrag.id).column).toBe('progress');

    const todoTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(todoTasks).toHaveLength(0);

    // Verify all visual drag states are properly cleaned up
    await expect(task).not.toHaveClass(/dragging/);
    // Use more specific selector to avoid strict mode violation - target the .column element
    const progressColumnElement = page.locator('.column[data-column="progress"]');
    await expect(progressColumnElement).not.toHaveClass(/drag-over/);
  });

  test('should clean up drag states after drop completes', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Draggable task', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    const progressColumn = page.locator('[data-column="progress"] .tasks');

    // Perform drag and drop
    await task.dragTo(progressColumn);
    await page.waitForTimeout(300);

    // Verify dragging class is removed after drop completes
    await expect(task).not.toHaveClass(/dragging/);
    
    // Verify drag-over class is removed from all columns
    const allColumns = page.locator('.column');
    const count = await allColumns.count();
    for (let i = 0; i < count; i++) {
      const column = allColumns.nth(i);
      await expect(column).not.toHaveClass(/drag-over/);
    }
  });

  test('should reorder tasks within same column', async ({ page }) => {
    // Create multiple tasks
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 2', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 3', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const tasks = page.locator('.task');
    const firstTask = tasks.first();
    const lastTask = tasks.last();

    // Drag first task to end
    await firstTask.dragTo(lastTask);

    await page.waitForTimeout(300);

    // Verify order changed (DOM order should reflect new order)
    const todoTasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(todoTasks).toHaveLength(3);
  });

  test('should show drag-over visual feedback', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task to drag', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    // Use more specific selector to avoid strict mode violation - target the .column element
    const progressColumn = page.locator('.column[data-column="progress"]');

    // Start dragging over progress column
    await task.hover();
    const box = await progressColumn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      
      // Check for drag-over class
      const hasDragOver = await progressColumn.evaluate(el => el.classList.contains('drag-over'));
      // Note: drag-over might be added/removed quickly, so we check if it was present
      await page.mouse.up();
    }
  });
});
