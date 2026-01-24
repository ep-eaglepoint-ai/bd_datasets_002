// DOM Rendering Tests
// Requirement 8: DOM rendering tests must verify using page.locator('.task').count() that the correct number of 
// tasks appear in each column, must use expect(page.locator('[data-count="todo"]')).toHaveText() to verify task 
// count badges accurately reflect the number of tasks in each column, must verify that empty columns display the 
// empty state message using expect(page.locator('#todo-tasks .empty-state')).toBeVisible(), and must verify proper 
// HTML structure by checking data-id attributes exist on all task elements.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('verifies correct task counts in columns, task count badges accuracy, empty state display, and data-id attributes', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'progress');
    window.createTask('Task 4', 'done');
  });
  await page.reload();
  
  // Verify using page.locator('.task').count() that correct number of tasks appear in each column
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks .task');
  const doneTasks = page.locator('#done-tasks .task');
  
  await expect(todoTasks).toHaveCount(2);
  await expect(progressTasks).toHaveCount(1);
  await expect(doneTasks).toHaveCount(1);
  
  // Use expect(page.locator('[data-count="todo"]')).toHaveText() to verify task count badges accurately reflect number of tasks
  const todoCount = page.locator('[data-count="todo"]');
  const progressCount = page.locator('[data-count="progress"]');
  const doneCount = page.locator('[data-count="done"]');
  
  await expect(todoCount).toHaveText('2');
  await expect(progressCount).toHaveText('1');
  await expect(doneCount).toHaveText('1');
  
  // Verify that empty columns display empty state message using expect(page.locator('#todo-tasks .empty-state')).toBeVisible()
  // Clear all tasks from todo column
  const tasks = await page.evaluate(() => window.tasks);
  for (const task of tasks) {
    if (task.column === 'todo') {
      await page.evaluate((id) => {
        window.deleteTask(id);
      }, task.id);
    }
  }
  await page.reload();
  
  const todoEmptyState = page.locator('#todo-tasks .empty-state');
  await expect(todoEmptyState).toBeVisible();
  
  // Verify proper HTML structure by checking data-id attributes exist on all task elements
  const allTasks = page.locator('.task');
  const count = await allTasks.count();
  
  for (let i = 0; i < count; i++) {
    const task = allTasks.nth(i);
    const dataId = await task.getAttribute('data-id');
    expect(dataId).toBeTruthy();
    expect(dataId).toMatch(/^task-/);
  }
});
