const { test, expect } = require('@playwright/test');

test.describe('Inline Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should enter edit mode on double click', async ({ page }) => {
    // Create and render task
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Editable task', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    const taskTitle = task.locator('.task-title');

    // Double click to edit
    await taskTitle.dblclick();

    // Verify editing mode
    await expect(task).toHaveClass(/editing/);
    const editInput = task.locator('.task-edit-input');
    await expect(editInput).toBeVisible();
    await expect(taskTitle).not.toBeVisible();
  });

  test('should save changes on Enter key', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Original title', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.locator('.task-title').dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('Updated title');
    await editInput.press('Enter');

    // Wait for edit to complete
    await page.waitForTimeout(200);

    // Verify update
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe('Updated title');

    // Verify DOM updated
    await expect(task.locator('.task-title')).toHaveText('Updated title');
  });

  test('should save changes on blur', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Original', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.locator('.task-title').dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('Updated on blur');
    await editInput.blur();

    await page.waitForTimeout(200);

    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe('Updated on blur');
  });

  test('should cancel editing with Escape key', async ({ page }) => {
    const originalTitle = 'Original title';
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: originalTitle, column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.locator('.task-title').dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('Changed but cancelled');
    await editInput.press('Escape');

    await page.waitForTimeout(200);

    // Verify original title preserved
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe(originalTitle);
    await expect(task.locator('.task-title')).toHaveText(originalTitle);
  });

  test('should not save empty title', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Original', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.locator('.task-title').dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('   ');
    await editInput.press('Enter');

    await page.waitForTimeout(200);

    // Original title should remain
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe('Original');
  });

  test('should trim whitespace when saving', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Original', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.locator('.task-title').dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('  Trimmed title  ');
    await editInput.press('Enter');

    await page.waitForTimeout(200);

    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe('Trimmed title');
  });
});
