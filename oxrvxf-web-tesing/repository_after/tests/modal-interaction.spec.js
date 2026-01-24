// Modal Interaction Tests
// Requirements: Test modal opening, closing, form submission, and keyboard interactions

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens modal when clicking add task button', async ({ page }) => {
  const addButton = page.locator('[data-column="todo"] .add-task-btn');
  await addButton.click();
  
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).toHaveClass(/active/);
  await expect(modalOverlay).toBeVisible();
});

test('input receives focus when modal opens', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const taskInput = page.locator('#task-input');
  await expect(taskInput).toBeFocused();
});

test('submitting empty title does not create task or close modal', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const modalOverlay = page.locator('.modal-overlay');
  const taskInput = page.locator('#task-input');
  
  // Submit with empty input
  await taskInput.press('Enter');
  
  // Modal should still be open
  await expect(modalOverlay).toHaveClass(/active/);
  
  // No task should be created
  const tasks = await page.evaluate(() => window.tasks);
  const initialCount = tasks.length;
  await page.reload();
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks.length).toBe(initialCount);
});

test('submitting whitespace-only title does not create task', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const taskInput = page.locator('#task-input');
  await taskInput.fill('   ');
  await taskInput.press('Enter');
  
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).toHaveClass(/active/);
  
  const tasksBefore = await page.evaluate(() => window.tasks.length);
  await page.reload();
  const tasksAfter = await page.evaluate(() => window.tasks.length);
  expect(tasksAfter).toBe(tasksBefore);
});

test('creates task and closes modal on valid submission', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const taskInput = page.locator('#task-input');
  await taskInput.fill('New Task from Modal');
  await taskInput.press('Enter');
  
  // Modal should be closed
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  // Task should be created in correct column
  const todoTasks = page.locator('#todo-tasks .task');
  await expect(todoTasks.filter({ hasText: 'New Task from Modal' })).toBeVisible();
  
  // Verify in tasks array
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'New Task from Modal')).toBeDefined();
  expect(tasks.find(t => t.title === 'New Task from Modal')?.column).toBe('todo');
});

test('Escape key closes modal without creating task', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const taskInput = page.locator('#task-input');
  await taskInput.fill('Task that should not be created');
  
  const tasksBefore = await page.evaluate(() => window.tasks.length);
  
  // Press Escape
  await page.keyboard.press('Escape');
  
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  // Task should not be created
  const tasksAfter = await page.evaluate(() => window.tasks.length);
  expect(tasksAfter).toBe(tasksBefore);
  
  // Verify task does not exist
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Task that should not be created')).toBeUndefined();
});

test('clicking overlay backdrop closes modal', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).toHaveClass(/active/);
  
  // Click on overlay (not on modal content)
  await modalOverlay.click({ position: { x: 10, y: 10 } });
  
  await expect(modalOverlay).not.toHaveClass(/active/);
});

test('creates task in correct column based on button clicked', async ({ page }) => {
  // Create task in todo
  await page.locator('[data-column="todo"] .add-task-btn').click();
  await page.locator('#task-input').fill('Todo Task');
  await page.locator('#task-input').press('Enter');
  
  // Create task in progress
  await page.locator('[data-column="progress"] .add-task-btn').click();
  await page.locator('#task-input').fill('Progress Task');
  await page.locator('#task-input').press('Enter');
  
  // Create task in done
  await page.locator('[data-column="done"] .add-task-btn').click();
  await page.locator('#task-input').fill('Done Task');
  await page.locator('#task-input').press('Enter');
  
  // Verify tasks in correct columns
  await expect(page.locator('#todo-tasks .task').filter({ hasText: 'Todo Task' })).toBeVisible();
  await expect(page.locator('#progress-tasks .task').filter({ hasText: 'Progress Task' })).toBeVisible();
  await expect(page.locator('#done-tasks .task').filter({ hasText: 'Done Task' })).toBeVisible();
  
  // Verify in tasks array
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === 'Todo Task')?.column).toBe('todo');
  expect(tasks.find(t => t.title === 'Progress Task')?.column).toBe('progress');
  expect(tasks.find(t => t.title === 'Done Task')?.column).toBe('done');
});

test('cancel button closes modal', async ({ page }) => {
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  const cancelBtn = page.locator('#cancel-btn');
  await cancelBtn.click();
  
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).not.toHaveClass(/active/);
});
