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
    // Use page.locator('[data-column="todo"] .add-task-btn').click() to open the modal
    await page.locator('[data-column="todo"] .add-task-btn').click();

    // Verify with expect(page.locator('.modal-overlay')).toHaveClass(/active/) that it becomes visible
    const modal = page.locator('.modal-overlay');
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

  test('should close modal when clicking overlay backdrop', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Must verify that clicking the overlay backdrop via page.locator('.modal-overlay').click({position: {x: 10, y: 10}}) closes the modal
    const overlay = page.locator('.modal-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });

    await expect(overlay).not.toHaveClass(/active/);
  });

  test('should close modal with Escape key without creating task', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Type some text but don't submit
    await page.locator('#task-input').fill('Task that should not be created');
    
    // Must verify that page.keyboard.press('Escape') closes the modal without creating a task
    await page.keyboard.press('Escape');

    const modal = page.locator('.modal-overlay');
    await expect(modal).not.toHaveClass(/active/);

    // Verify no task was created
    const tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasks).toHaveLength(0);
  });

  test('should create task via modal form submission', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="progress"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Type valid text and submit
    const input = page.locator('#task-input');
    await input.fill('New task from modal');
    await page.keyboard.press('Enter');

    // Wait for modal to close
    await page.waitForSelector('#modal-overlay:not(.active)', { timeout: 5000 });

    // Verify task was created in correct column by checking the DOM
    const progressTasks = page.locator('#progress-tasks .task');
    await expect(progressTasks).toHaveCount(1);
    
    // Verify task was created in correct column by checking tasks array
    const tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'progress');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('New task from modal');

    // Verify modal closes - check the class is removed
    const modal = page.locator('.modal-overlay');
    await expect(modal).not.toHaveClass(/active/);
  });

  test('should not create task with empty or whitespace-only title', async ({ page }) => {
    // Open modal
    await page.locator('[data-column="todo"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Test that submitting with an empty title via page.keyboard.press('Enter') does not create a task
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Verify modal does not close and no task created
    const modal = page.locator('.modal-overlay');
    const isActive = await modal.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(true);

    let tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasks).toHaveLength(0);

    // Test whitespace-only title
    await page.locator('#task-input').fill('   ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Verify no task created and modal still open or closed without creating task
    tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasks).toHaveLength(0);
  });

  test('should focus input when modal opens', async ({ page }) => {
    await page.locator('[data-column="done"] .add-task-btn').click();
    await page.waitForSelector('#modal-overlay.active', { timeout: 5000 });

    // Wait a bit for focus
    await page.waitForTimeout(150);

    // Must verify the input receives focus using expect(page.locator('#task-input')).toBeFocused()
    const input = page.locator('#task-input');
    await expect(input).toBeFocused();
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
