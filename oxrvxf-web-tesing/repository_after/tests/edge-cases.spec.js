// Edge Case Tests
// Requirement 15: Edge case tests must verify using page.evaluate() that task titles containing special HTML characters 
// like angle brackets and ampersands are escaped and rendered as text not HTML by checking element.textContent versus 
// element.innerHTML, must test task creation with exactly 100 characters verifying the full title is saved and displayed, 
// must use dragTo() to drag a task onto itself and verify no state corruption occurs, must use page.evaluate() to fill 
// localStorage near its quota then test that the application handles the storage full condition gracefully, and must use 
// Promise.all() with multiple rapid sequential drag operations to verify the application handles race conditions without 
// corrupting state.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('handles HTML escaping, 100 character limit, drag onto self, localStorage quota, and rapid drag race conditions', async ({ page }) => {
  // Verify using page.evaluate() that task titles with special HTML characters are escaped and rendered as text
  const htmlTitle = '<script>alert("xss")</script>&<>"\'';
  
  await page.evaluate((title) => {
    window.createTask(title, 'todo');
  }, htmlTitle);
  await page.reload();
  
  // Select task by text content to ensure we get the right one
  const task = page.locator('#todo-tasks .task').filter({ hasText: htmlTitle });
  const taskTitle = task.locator('.task-title');
  
  // Check element.textContent versus element.innerHTML
  const textContent = await taskTitle.textContent();
  expect(textContent).toBe(htmlTitle);
  
  const innerHTML = await taskTitle.innerHTML();
  expect(innerHTML).not.toContain('<script>');
  expect(innerHTML).not.toContain('alert');
  expect(innerHTML).toContain('&lt;');
  expect(innerHTML).toContain('&gt;');
  
  // Verify it's rendered as text, not HTML
  const scriptTag = task.locator('script');
  await expect(scriptTag).toHaveCount(0);
  
  // Test task creation with exactly 100 characters verifying full title is saved and displayed
  const longTitle = 'a'.repeat(100);
  
  const task100 = await page.evaluate((title) => {
    return window.createTask(title, 'todo');
  }, longTitle);
  
  expect(task100.title).toHaveLength(100);
  expect(task100.title).toBe(longTitle);
  
  await page.reload();
  
  const taskElement = page.locator('#todo-tasks .task').filter({ hasText: longTitle });
  const taskTitle100 = taskElement.locator('.task-title');
  const displayedTitle = await taskTitle100.textContent();
  expect(displayedTitle).toBe(longTitle);
  expect(displayedTitle).toHaveLength(100);
  
  // Use dragTo() to drag task onto itself and verify no state corruption occurs
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  await page.reload();
  
  const taskToDrag = page.locator('#todo-tasks .task').filter({ hasText: 'Test Task' });
  const taskId = await taskToDrag.getAttribute('data-id');
  
  // Get initial state
  const initialTasks = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.tasks));
  });
  
  // Drag task onto itself
  await taskToDrag.dragTo(taskToDrag);
  await page.waitForTimeout(300);
  
  // Verify state not corrupted
  const finalTasks = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.tasks));
  });
  
  expect(finalTasks).toHaveLength(initialTasks.length);
  expect(finalTasks.find(t => t.id === taskId)).toBeDefined();
  expect(finalTasks.find(t => t.id === taskId)?.title).toBe('Test Task');
  expect(finalTasks.find(t => t.id === taskId)?.column).toBe('todo');
  
  // Use page.evaluate() to fill localStorage near quota then test application handles storage full condition gracefully
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
      window.createTask('Test Task Quota', 'todo');
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
  
  // Clear localStorage for next test
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  
  // Use Promise.all() with multiple rapid sequential drag operations to verify application handles race conditions
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
  
  // Perform multiple rapid drag operations using Promise.all()
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
  
  // Verify state is consistent and not corrupted
  const finalTasksAfterRapid = await page.evaluate(() => window.tasks);
  expect(finalTasksAfterRapid).toHaveLength(5);
  
  // Verify all tasks still exist
  const taskTitles = finalTasksAfterRapid.map(t => t.title);
  expect(taskTitles).toContain('Task 1');
  expect(taskTitles).toContain('Task 2');
  expect(taskTitles).toContain('Task 3');
  expect(taskTitles).toContain('Task 4');
  expect(taskTitles).toContain('Task 5');
  
  // Verify no duplicate IDs
  const taskIds = finalTasksAfterRapid.map(t => t.id);
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
