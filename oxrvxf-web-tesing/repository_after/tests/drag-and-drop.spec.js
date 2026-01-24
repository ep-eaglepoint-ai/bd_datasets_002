// Drag-and-Drop Tests
// Requirement 4: Drag-and-drop tests must use Playwright's page.locator().dragTo() method to simulate a complete 
// drag operation from a task in one column to another column, then verify using locator assertions that the task 
// element now exists within the target column's DOM container, use page.evaluate() to confirm the tasks array 
// reflects the new column assignment, and verify through expect(page.locator()).toHaveClass() that all visual 
// drag states like the dragging and drag-over classes are properly cleaned up after the drop completes.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('drags task from one column to another using dragTo, verifies DOM and state, and confirms drag states are cleaned up', async ({ page }) => {
  // Create tasks
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
  });
  
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks');
  
  // Verify initial state
  await expect(todoTasks).toHaveCount(2);
  
  // Use Playwright's page.locator().dragTo() method to simulate complete drag operation
  await todoTasks.first().dragTo(progressTasks);
  
  // Wait for DOM update
  await page.waitForTimeout(200);
  
  // Verify using locator assertions that task element now exists within target column's DOM container
  const taskInProgress = progressTasks.locator('.task').filter({ hasText: 'Task 1' });
  await expect(taskInProgress).toBeVisible();
  
  // Verify task removed from source column
  await expect(todoTasks).toHaveCount(1);
  
  // Use page.evaluate() to confirm tasks array reflects new column assignment
  const tasks = await page.evaluate(() => window.tasks);
  const movedTask = tasks.find(t => t.title === 'Task 1');
  expect(movedTask.column).toBe('progress');
  
  // Verify through expect(page.locator()).toHaveClass() that all visual drag states are cleaned up
  const draggedTask = page.locator('.task').filter({ hasText: 'Task 1' });
  await expect(draggedTask).not.toHaveClass(/dragging/);
  
  // Verify drag-over class is removed from columns
  const todoColumn = page.locator('[data-column="todo"]');
  const progressColumn = page.locator('[data-column="progress"]');
  await expect(todoColumn).not.toHaveClass(/drag-over/);
  await expect(progressColumn).not.toHaveClass(/drag-over/);
});
