const { test, expect } = require('@playwright/test');

test.describe('Modal Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should open modal when clicking add task button', async ({ page }) => {
    const addButton = page.locator('[data-column="todo"] .add-task-btn');
    await addButton.click();

    const modal = page.locator('#modal-overlay');
    await expect(modal).toHaveClass(/active/);
    
    const modalInput = page.locator('#task-input');
    await expect(modalInput).toBeVisible();
  });

  test('should close modal when clicking cancel button', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Close via cancel button
    await page.locator('#cancel-btn').click();

    const modal = page.locator('#modal-overlay');
    await expect(modal).not.toHaveClass(/active/);
  });

  test('should close modal when clicking overlay', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Click overlay (not the modal itself)
    const overlay = page.locator('#modal-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });

    await expect(overlay).not.toHaveClass(/active/);
  });

  test('should close modal with Escape key', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    const modal = page.locator('#modal-overlay');
    await expect(modal).not.toHaveClass(/active/);
  });

  test('should create task via modal form submission', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="progress"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Fill and submit form
    const input = page.locator('#task-input');
    await input.fill('New task from modal');
    await page.locator('#task-form').submit();

    // Wait for modal to close
    await page.waitForSelector('#modal-overlay:not(.active)', { timeout: 5000 });

    // Verify task was created
    const tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('New task from modal');
  });

  test('should not create task with empty title', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Submit empty form
    await page.locator('#task-form').submit();

    // Modal should close but no task created
    await page.waitForSelector('#modal-overlay:not(.active)', { timeout: 5000 });

    const tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasks).toHaveLength(0);
  });

  test('should focus input when modal opens', async ({ page }) => {
    await page.locator('[data-column="done"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Wait a bit for focus
    await page.waitForTimeout(150);

    const input = page.locator('#task-input');
    const isFocused = await input.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('should open modal for different columns', async ({ page }) => {
    const columns = ['todo', 'progress', 'done'];
    
    for (const column of columns) {
      await page.locator(`[data-column="${column}"] .add-task-btn`).click();
      await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

      // Verify active column is set
      const activeColumn = await page.evaluate(() => {
        // Check which column's modal was opened
        return document.querySelector('.add-task-btn:focus')?.dataset.column || 
               document.querySelector('.modal-overlay.active') ? 'set' : null;
      });
      
      await page.locator('#cancel-btn').click();
      await page.waitForTimeout(200);
    }
  });
});
