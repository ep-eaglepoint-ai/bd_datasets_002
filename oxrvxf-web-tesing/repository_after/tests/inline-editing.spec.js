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
    const originalTask = await page.evaluate(({ title, column }) => {
      const task = window.createTask(title, column);
      window.renderAllTasks();
      return task;
    }, { title: 'Editable task', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    const taskTitle = task.locator('.task-title');

    // Must use page.locator('.task').dblclick() to trigger edit mode
    await task.dblclick();

    // Verify the task has the editing class
    await expect(task).toHaveClass(/editing/);
    
    // Verify the input is visible and pre-filled with the current title
    const editInput = task.locator('.task-edit-input');
    await expect(editInput).toBeVisible();
    const inputValue = await editInput.inputValue();
    expect(inputValue).toBe(originalTask.title);
    await expect(taskTitle).not.toBeVisible();
  });

  test('should save changes on Enter key', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Original title', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.dblclick();

    // Must use page.fill() to change the text and page.keyboard.press('Enter') to save
    const editInput = task.locator('.task-edit-input');
    await editInput.fill('Updated title');
    await page.keyboard.press('Enter');

    // Wait for edit to complete
    await page.waitForTimeout(200);

    // Must verify both the DOM text content and the tasks array via page.evaluate() reflect the new title
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
    await task.dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('Updated on blur');
    
    // Must verify that page.locator('.task-edit-input').blur() saves changes
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

  test('should preserve original title when attempting to save empty string', async ({ page }) => {
    const originalTitle = 'Original title';
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: originalTitle, column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    await task.dblclick();

    const editInput = task.locator('.task-edit-input');
    await editInput.fill('');
    await editInput.press('Enter');

    await page.waitForTimeout(200);

    // Must test that attempting to save an empty string preserves the original title in both the DOM and the data layer
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe(originalTitle);
    
    // Verify DOM also preserves original title
    await expect(task.locator('.task-title')).toHaveText(originalTitle);
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
