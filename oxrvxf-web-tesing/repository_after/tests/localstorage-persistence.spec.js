// LocalStorage Persistence Tests
// Requirement 5: LocalStorage persistence tests must use page.evaluate() to pre-populate localStorage with specific 
// test data before page.reload(), then verify after reload that the rendered DOM matches the persisted state, must 
// test that corrupted or malformed JSON in localStorage does not crash the application but instead falls back 
// gracefully by checking that the page still renders and functions, must verify that when localStorage is completely 
// empty the application initializes with the default sample tasks visible in the DOM, and must use page.evaluate() 
// after every state-modifying UI action to confirm localStorage contains valid JSON matching the expected state.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Clear localStorage - tests will control when to reload
  await page.evaluate(() => localStorage.clear());
});

test('persists state across reloads, handles corrupted JSON gracefully, initializes with defaults when empty, and updates localStorage after state changes', async ({ page }) => {
  // Use page.evaluate() to pre-populate localStorage with specific test data before page.reload()
  await page.evaluate(() => {
    const testData = [
      { id: 'task-1', title: 'Persisted Task 1', column: 'todo' },
      { id: 'task-2', title: 'Persisted Task 2', column: 'progress' },
      { id: 'task-3', title: 'Persisted Task 3', column: 'done' }
    ];
    localStorage.setItem('kanban-board-state', JSON.stringify(testData));
  });
  
  // Reload page
  await page.reload();
  
  // Verify after reload that rendered DOM matches persisted state
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks .task');
  const doneTasks = page.locator('#done-tasks .task');
  
  await expect(todoTasks).toHaveCount(1);
  await expect(progressTasks).toHaveCount(1);
  await expect(doneTasks).toHaveCount(1);
  await expect(todoTasks.filter({ hasText: 'Persisted Task 1' })).toBeVisible();
  await expect(progressTasks.filter({ hasText: 'Persisted Task 2' })).toBeVisible();
  await expect(doneTasks.filter({ hasText: 'Persisted Task 3' })).toBeVisible();
  
  // Test that corrupted or malformed JSON does not crash application but falls back gracefully
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', 'invalid json {');
  });
  
  await page.reload();
  
  // Check that page still renders and functions
  await expect(page.locator('.board')).toBeVisible();
  // Use first() to handle multiple elements with data-column="todo"
  await expect(page.locator('[data-column="todo"]').first()).toBeVisible();
  
  // Verify application functions (can create tasks)
  await page.evaluate(() => {
    window.createTask('New Task', 'todo');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.length).toBeGreaterThan(0);
  
  // Verify that when localStorage is completely empty, application initializes with default sample tasks
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Verify default tasks are visible in DOM
  const defaultTodoTasks = page.locator('#todo-tasks .task');
  const defaultProgressTasks = page.locator('#progress-tasks .task');
  const defaultDoneTasks = page.locator('#done-tasks .task');
  
  const totalDefaultTasks = await defaultTodoTasks.count() + await defaultProgressTasks.count() + await defaultDoneTasks.count();
  expect(totalDefaultTasks).toBeGreaterThan(0);
  
  // Use page.evaluate() after every state-modifying UI action to confirm localStorage contains valid JSON
  // Create task
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  
  let storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(Array.isArray(storageData)).toBe(true);
  expect(storageData.find(t => t.title === 'Test Task')).toBeDefined();
  
  // Move task
  const taskId = storageData.find(t => t.title === 'Test Task').id;
  await page.evaluate((id) => {
    window.moveTask(id, 'progress');
  }, taskId);
  
  storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData.find(t => t.id === taskId)?.column).toBe('progress');
  
  // Delete task
  await page.evaluate((id) => {
    window.deleteTask(id);
  }, taskId);
  
  storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData.find(t => t.id === taskId)).toBeUndefined();
  expect(Array.isArray(storageData)).toBe(true);
});
