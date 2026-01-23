import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
  });
  await page.reload();
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
    if (window.saveState) window.saveState();
  });
});

test('modal opens, handles input validation, and closes properly', async ({ page }) => {
  // Open modal
  await page.locator('[data-column="todo"] .add-task-btn').click();
  
  // Verify modal is visible
  const modalOverlay = page.locator('.modal-overlay');
  await expect(modalOverlay).toHaveClass(/active/);
  
  // Verify input receives focus
  const taskInput = page.locator('#task-input');
  await expect(taskInput).toBeFocused();
  
  // Test empty title does not create task
  await taskInput.fill('');
  await page.keyboard.press('Enter');
  await expect(modalOverlay).toHaveClass(/active/);
  
  const tasksAfterEmpty = await page.evaluate(() => window.tasks);
  const todoTasksAfterEmpty = tasksAfterEmpty.filter(t => t.column === 'todo');
  expect(todoTasksAfterEmpty.length).toBe(0);
  
  // Test whitespace-only title does not create task
  await taskInput.fill('   ');
  await page.keyboard.press('Enter');
  await expect(modalOverlay).toHaveClass(/active/);
  
  // Test valid text creates task and closes modal
  await taskInput.fill('New Task');
  await page.keyboard.press('Enter');
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  const tasks = await page.evaluate(() => window.tasks);
  const todoTask = tasks.find(t => t.column === 'todo' && t.title === 'New Task');
  expect(todoTask).toBeDefined();
  
  // Test Escape key closes modal
  await page.locator('[data-column="progress"] .add-task-btn').click();
  await expect(modalOverlay).toHaveClass(/active/);
  await page.keyboard.press('Escape');
  await expect(modalOverlay).not.toHaveClass(/active/);
  
  // Test clicking overlay backdrop closes modal
  await page.locator('[data-column="done"] .add-task-btn').click();
  await expect(modalOverlay).toHaveClass(/active/);
  await modalOverlay.click({ position: { x: 10, y: 10 } });
  await expect(modalOverlay).not.toHaveClass(/active/);
});
