// Modal Interaction Tests
// Requirement 6: Modal interaction tests must use page.locator('[data-column="todo"] .add-task-btn').click() to 
// open the modal and verify with expect(page.locator('.modal-overlay')).toHaveClass(/active/) that it becomes visible, 
// must verify the input receives focus using expect(page.locator('#task-input')).toBeFocused(), must test that 
// submitting with an empty or whitespace-only title via page.keyboard.press('Enter') does not create a task and 
// does not close the modal, must test that typing valid text and submitting creates the task in the correct column 
// verified by checking the DOM and closes the modal verified by checking the class is removed, must verify that 
// page.keyboard.press('Escape') closes the modal without creating a task, and must verify that clicking the overlay 
// backdrop via page.locator('.modal-overlay').click({position: {x: 10, y: 10}}) closes the modal.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('opens modal, verifies focus, handles empty/whitespace submission, creates task and closes modal, handles Escape, and closes on backdrop click', async ({ page }) => {
  // Use page.locator('[data-column="todo"] .add-task-btn').click() to open modal
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  // Verify with expect(page.locator('.modal-overlay')).toHaveClass(/active/) that it becomes visible
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).toHaveClass(/active/);
  await expect(modalOverlay).toBeVisible();
  
  // Verify input receives focus using expect(page.locator('#task-input')).toBeFocused()
  const taskInput = page.locator('#task-input');
  await expect(taskInput).toBeFocused();
  
  // Test that submitting with empty title via page.keyboard.press('Enter') does not create task and does not close modal
  await taskInput.press('Enter');
  await expect(modalOverlay).toHaveClass(/active/);
  
  const tasksBeforeEmpty = await page.evaluate(() => window.tasks.length);
  await page.reload();
  const tasksAfterEmpty = await page.evaluate(() => window.tasks.length);
  expect(tasksAfterEmpty).toBe(tasksBeforeEmpty);
  
  // Test that submitting with whitespace-only title does not create task
  await page.locator('[data-column="todo"] .add-task-btn').click();
  await taskInput.fill('   ');
  await taskInput.press('Enter');
  await expect(modalOverlay).toHaveClass(/active/);
  
  // Test that typing valid text and submitting creates task in correct column (verified by DOM) and closes modal (verified by class removed)
  await taskInput.fill('New Task from Modal');
  await taskInput.press('Enter');
  
  // Verify modal closes (class removed)
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  // Verify task created in correct column by checking DOM
  const todoTasks = page.locator('#todo-tasks .task');
  await expect(todoTasks.filter({ hasText: 'New Task from Modal' })).toBeVisible();
  
  // Verify that page.keyboard.press('Escape') closes modal without creating task
  await page.locator('[data-column="todo"] .add-task-btn').click();
  await taskInput.fill('Task that should not be created');
  const tasksBeforeEscape = await page.evaluate(() => window.tasks.length);
  
  await page.keyboard.press('Escape');
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  const tasksAfterEscape = await page.evaluate(() => window.tasks.length);
  expect(tasksAfterEscape).toBe(tasksBeforeEscape);
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Task that should not be created')).toBeUndefined();
  
  // Verify that clicking overlay backdrop via page.locator('.modal-overlay').click({position: {x: 10, y: 10}}) closes modal
  await page.locator('[data-column="todo"] .add-task-btn').click();
  await expect(modalOverlay).toHaveClass(/active/);
  
  await modalOverlay.click({ position: { x: 10, y: 10 } });
  await expect(modalOverlay).not.toHaveClass(/active/);
});
