const { test, expect } = require('@playwright/test');

test.describe('DOM Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should render task counts correctly', async ({ page }) => {
    // Create tasks in different columns
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo 2', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Progress 1', column: 'progress' });

    await page.waitForSelector('.task-count', { timeout: 5000 });

    // Verify counts
    const todoCount = await page.locator('[data-count="todo"]').textContent();
    expect(todoCount).toBe('2');

    const progressCount = await page.locator('[data-count="progress"]').textContent();
    expect(progressCount).toBe('1');

    const doneCount = await page.locator('[data-count="done"]').textContent();
    expect(doneCount).toBe('0');
  });

  test('should show empty state when column has no tasks', async ({ page }) => {
    await page.evaluate(() => {
      window.renderAllTasks();
    });

    await page.waitForSelector('.tasks', { timeout: 5000 });

    const emptyState = page.locator('.empty-state');
    await expect(emptyState.first()).toBeVisible();
    await expect(emptyState.first()).toContainText('No tasks yet');
  });

  test('should render task HTML structure correctly', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Test task', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    
    // Verify structure
    await expect(task).toHaveAttribute('draggable', 'true');
    await expect(task.locator('.task-content')).toBeVisible();
    await expect(task.locator('.task-title')).toBeVisible();
    await expect(task.locator('.task-edit-input')).toBeVisible();
    await expect(task.locator('.task-delete')).toBeVisible();
  });

  test('should update counts after task deletion', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 2', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    let todoCount = await page.locator('[data-count="todo"]').textContent();
    expect(todoCount).toBe('2');

    // Delete a task
    const task = page.locator('.task').first();
    await task.hover();
    await task.locator('.task-delete').click();
    await page.waitForTimeout(200);

    todoCount = await page.locator('[data-count="todo"]').textContent();
    expect(todoCount).toBe('1');
  });

  test('should escape HTML in task titles', async ({ page }) => {
    const htmlTitle = '<script>alert("xss")</script>';
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: htmlTitle, column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const taskTitle = page.locator('.task-title').first();
    const textContent = await taskTitle.textContent();
    
    // Should not contain raw HTML
    expect(textContent).not.toContain('<script>');
    expect(textContent).toContain('alert');
  });

  test('should render tasks in correct columns', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo task', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Progress task', column: 'progress' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const todoTasks = page.locator('#todo-tasks .task');
    const progressTasks = page.locator('#progress-tasks .task');
    const doneTasks = page.locator('#done-tasks .task');

    await expect(todoTasks).toHaveCount(1);
    await expect(progressTasks).toHaveCount(1);
    await expect(doneTasks).toHaveCount(0);
  });
});
