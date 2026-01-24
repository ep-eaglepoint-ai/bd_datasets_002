// DOM Rendering Tests
// Requirements: Test task counts, badges, empty states, and HTML structure

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('renders correct number of tasks in each column', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'progress');
    window.createTask('Task 4', 'done');
  });
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks .task');
  const doneTasks = page.locator('#done-tasks .task');
  
  await expect(todoTasks).toHaveCount(2);
  await expect(progressTasks).toHaveCount(1);
  await expect(doneTasks).toHaveCount(1);
});

test('task count badges reflect correct number of tasks', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'progress');
  });
  await page.reload();
  
  const todoCount = page.locator('[data-count="todo"]');
  const progressCount = page.locator('[data-count="progress"]');
  const doneCount = page.locator('[data-count="done"]');
  
  await expect(todoCount).toHaveText('2');
  await expect(progressCount).toHaveText('1');
  await expect(doneCount).toHaveText('0');
});

test('empty columns display empty state message', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Clear all tasks
  const tasks = await page.evaluate(() => window.tasks);
  for (const task of tasks) {
    await page.evaluate((id) => {
      window.deleteTask(id);
    }, task.id);
  }
  await page.reload();
  
  const todoEmptyState = page.locator('#todo-tasks .empty-state');
  const progressEmptyState = page.locator('#progress-tasks .empty-state');
  const doneEmptyState = page.locator('#done-tasks .empty-state');
  
  await expect(todoEmptyState).toBeVisible();
  await expect(progressEmptyState).toBeVisible();
  await expect(doneEmptyState).toBeVisible();
});

test('all task elements have data-id attributes', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'progress');
  });
  await page.reload();
  
  const tasks = page.locator('.task');
  const count = await tasks.count();
  
  for (let i = 0; i < count; i++) {
    const task = tasks.nth(i);
    const dataId = await task.getAttribute('data-id');
    expect(dataId).toBeTruthy();
    expect(dataId).toMatch(/^task-/);
  }
});

test('task count badges update when tasks are added', async ({ page }) => {
  await page.reload();
  
  const todoCount = page.locator('[data-count="todo"]');
  const initialCount = await todoCount.textContent();
  
  await page.evaluate(() => {
    window.createTask('New Task', 'todo');
  });
  await page.reload();
  
  const newCount = await todoCount.textContent();
  expect(parseInt(newCount)).toBe(parseInt(initialCount) + 1);
});

test('task count badges update when tasks are deleted', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
  });
  await page.reload();
  
  const todoCount = page.locator('[data-count="todo"]');
  await expect(todoCount).toHaveText('2');
  
  // Delete one task
  const task = page.locator('#todo-tasks .task').first();
  const taskId = await task.getAttribute('data-id');
  await page.evaluate((id) => {
    window.deleteTask(id);
  }, taskId);
  await page.reload();
  
  await expect(todoCount).toHaveText('1');
});

test('task count badges update when tasks are moved', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
  });
  await page.reload();
  
  const todoCount = page.locator('[data-count="todo"]');
  const progressCount = page.locator('[data-count="progress"]');
  
  await expect(todoCount).toHaveText('2');
  await expect(progressCount).toHaveText('0');
  
  // Move one task
  const task = page.locator('#todo-tasks .task').first();
  const taskId = await task.getAttribute('data-id');
  await page.evaluate((id) => {
    window.moveTask(id, 'progress');
  }, taskId);
  await page.reload();
  
  await expect(todoCount).toHaveText('1');
  await expect(progressCount).toHaveText('1');
});

test('empty state disappears when task is added', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Clear all tasks
  const tasks = await page.evaluate(() => window.tasks);
  for (const task of tasks) {
    await page.evaluate((id) => {
      window.deleteTask(id);
    }, task.id);
  }
  await page.reload();
  
  const todoEmptyState = page.locator('#todo-tasks .empty-state');
  await expect(todoEmptyState).toBeVisible();
  
  // Add a task
  await page.evaluate(() => {
    window.createTask('New Task', 'todo');
  });
  await page.reload();
  
  await expect(todoEmptyState).not.toBeVisible();
  await expect(page.locator('#todo-tasks .task')).toHaveCount(1);
});
