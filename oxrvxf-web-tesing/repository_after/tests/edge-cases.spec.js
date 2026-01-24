// Edge Case Tests
// Requirements: Test HTML escaping, 100 character limit, drag onto self, localStorage quota, race conditions

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('escapes HTML characters in task titles', async ({ page }) => {
  const htmlTitle = '<script>alert("xss")</script>&<>"\'';
  
  await page.evaluate((title) => {
    window.createTask(title, 'todo');
  }, htmlTitle);
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const taskTitle = task.locator('.task-title');
  
  // Get textContent (should be escaped)
  const textContent = await taskTitle.textContent();
  expect(textContent).toBe(htmlTitle);
  
  // Get innerHTML (should not contain actual HTML tags)
  const innerHTML = await taskTitle.innerHTML();
  expect(innerHTML).not.toContain('<script>');
  expect(innerHTML).not.toContain('alert');
  expect(innerHTML).toContain('&lt;');
  expect(innerHTML).toContain('&gt;');
  
  // Verify it's rendered as text, not HTML
  const scriptTag = task.locator('script');
  await expect(scriptTag).toHaveCount(0);
});

test('handles task creation with exactly 100 characters', async ({ page }) => {
  const longTitle = 'a'.repeat(100);
  
  const task = await page.evaluate((title) => {
    return window.createTask(title, 'todo');
  }, longTitle);
  
  expect(task.title).toHaveLength(100);
  expect(task.title).toBe(longTitle);
  
  await page.reload();
  
  const taskElement = page.locator('#todo-tasks .task').first();
  const taskTitle = taskElement.locator('.task-title');
  const displayedTitle = await taskTitle.textContent();
  expect(displayedTitle).toBe(longTitle);
  expect(displayedTitle).toHaveLength(100);
});

test('dragging task onto itself does not corrupt state', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const taskId = await task.getAttribute('data-id');
  
  // Get initial state
  const initialTasks = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.tasks));
  });
  
  // Try to drag task onto itself (same position)
  await task.dragTo(task);
  await page.waitForTimeout(300);
  
  // Verify state not corrupted
  const finalTasks = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.tasks));
  });
  
  expect(finalTasks).toHaveLength(initialTasks.length);
  expect(finalTasks.find(t => t.id === taskId)).toBeDefined();
  expect(finalTasks.find(t => t.id === taskId)?.title).toBe('Test Task');
  expect(finalTasks.find(t => t.id === taskId)?.column).toBe('todo');
});

test('handles localStorage quota exceeded gracefully', async ({ page }) => {
  // Fill localStorage near quota
  await page.evaluate(() => {
    const largeString = 'x'.repeat(1024 * 1024); // 1MB
    let key = 0;
    try {
      while (true) {
        localStorage.setItem(`test-key-${key}`, largeString);
        key++;
      }
    } catch (e) {
      // Quota exceeded
    }
  });
  
  // Try to create a task
  try {
    await page.evaluate(() => {
      window.createTask('Test Task', 'todo');
    });
  } catch (e) {
    // Expected to fail silently or handle gracefully
  }
  
  // Verify page still renders
  await expect(page.locator('.board')).toBeVisible();
  
  // Verify application still functions (can read state)
  const tasks = await page.evaluate(() => {
    try {
      return window.tasks;
    } catch {
      return [];
    }
  });
  
  expect(Array.isArray(tasks)).toBe(true);
  
  // Clear localStorage for cleanup
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('handles rapid sequential drag operations without state corruption', async ({ page }) => {
  await page.evaluate(() => {
    window.createTask('Task 1', 'todo');
    window.createTask('Task 2', 'todo');
    window.createTask('Task 3', 'todo');
    window.createTask('Task 4', 'progress');
    window.createTask('Task 5', 'progress');
  });
  await page.reload();
  
  const todoTasks = page.locator('#todo-tasks');
  const progressTasks = page.locator('#progress-tasks');
  const doneTasks = page.locator('#done-tasks');
  
  // Perform multiple rapid drag operations
  const dragOperations = [
    async () => {
      const task = todoTasks.locator('.task').filter({ hasText: 'Task 1' });
      await task.dragTo(progressTasks);
    },
    async () => {
      const task = todoTasks.locator('.task').filter({ hasText: 'Task 2' });
      await task.dragTo(doneTasks);
    },
    async () => {
      const task = progressTasks.locator('.task').filter({ hasText: 'Task 4' });
      await task.dragTo(todoTasks);
    },
  ];
  
  // Execute all drag operations in parallel
  await Promise.all(dragOperations.map(op => op()));
  
  await page.waitForTimeout(500);
  
  // Verify state is consistent
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks).toHaveLength(5);
  
  // Verify all tasks still exist
  const taskTitles = tasks.map(t => t.title);
  expect(taskTitles).toContain('Task 1');
  expect(taskTitles).toContain('Task 2');
  expect(taskTitles).toContain('Task 3');
  expect(taskTitles).toContain('Task 4');
  expect(taskTitles).toContain('Task 5');
  
  // Verify no duplicate IDs
  const taskIds = tasks.map(t => t.id);
  const uniqueIds = new Set(taskIds);
  expect(uniqueIds.size).toBe(taskIds.length);
  
  // Verify localStorage is valid JSON
  const storageData = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
    } catch {
      return null;
    }
  });
  expect(storageData).not.toBeNull();
  expect(Array.isArray(storageData)).toBe(true);
  expect(storageData.length).toBe(5);
});

test('handles very long task titles gracefully', async ({ page }) => {
  // Test with title at maxlength (100 chars)
  const maxTitle = 'a'.repeat(100);
  
  const task = await page.evaluate((title) => {
    return window.createTask(title, 'todo');
  }, maxTitle);
  
  expect(task.title).toHaveLength(100);
  
  await page.reload();
  
  const taskElement = page.locator('#todo-tasks .task').first();
  const taskTitle = taskElement.locator('.task-title');
  const displayed = await taskTitle.textContent();
  expect(displayed).toHaveLength(100);
});

test('handles special characters in task titles', async ({ page }) => {
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  
  await page.evaluate((title) => {
    window.createTask(title, 'todo');
  }, specialChars);
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText(specialChars);
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === specialChars)).toBeDefined();
});

test('handles unicode characters in task titles', async ({ page }) => {
  const unicodeTitle = '测试任务 🎯 日本語 العربية';
  
  await page.evaluate((title) => {
    window.createTask(title, 'todo');
  }, unicodeTitle);
  await page.reload();
  
  const task = page.locator('#todo-tasks .task').first();
  const taskTitle = task.locator('.task-title');
  await expect(taskTitle).toHaveText(unicodeTitle);
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.find(t => t.title === unicodeTitle)).toBeDefined();
});
