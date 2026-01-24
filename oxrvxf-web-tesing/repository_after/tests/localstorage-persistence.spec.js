// LocalStorage Persistence Tests
// Requirements: Test localStorage persistence, corrupted data handling, and default state

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
});

test('persists state across page reloads', async ({ page }) => {
  // Pre-populate localStorage with test data
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
  
  // Verify DOM matches persisted state
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks .task');
  const doneTasks = page.locator('#done-tasks .task');
  
  await expect(todoTasks).toHaveCount(1);
  await expect(progressTasks).toHaveCount(1);
  await expect(doneTasks).toHaveCount(1);
  
  await expect(todoTasks.filter({ hasText: 'Persisted Task 1' })).toBeVisible();
  await expect(progressTasks.filter({ hasText: 'Persisted Task 2' })).toBeVisible();
  await expect(doneTasks.filter({ hasText: 'Persisted Task 3' })).toBeVisible();
  
  // Verify tasks array matches
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks).toHaveLength(3);
  expect(tasks.find(t => t.title === 'Persisted Task 1')).toBeDefined();
});

test('handles corrupted JSON in localStorage gracefully', async ({ page }) => {
  // Set corrupted JSON
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', 'invalid json {');
  });
  
  // Reload page
  await page.reload();
  
  // Verify page still renders
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('[data-column="todo"]')).toBeVisible();
  
  // Verify application functions (can create tasks)
  await page.evaluate(() => {
    window.createTask('New Task', 'todo');
  });
  
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.length).toBeGreaterThan(0);
  
  // Verify localStorage is now valid
  const storageData = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
    } catch {
      return null;
    }
  });
  expect(storageData).not.toBeNull();
  expect(Array.isArray(storageData)).toBe(true);
});

test('initializes with default sample tasks when localStorage is empty', async ({ page }) => {
  // Ensure localStorage is empty
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  // Verify default tasks are visible in DOM
  const todoTasks = page.locator('#todo-tasks .task');
  const progressTasks = page.locator('#progress-tasks .task');
  const doneTasks = page.locator('#done-tasks .task');
  
  // Should have at least one default task
  const totalTasks = await todoTasks.count() + await progressTasks.count() + await doneTasks.count();
  expect(totalTasks).toBeGreaterThan(0);
  
  // Verify default tasks exist in tasks array
  const tasks = await page.evaluate(() => window.tasks);
  expect(tasks.length).toBeGreaterThan(0);
  
  // Check for default task titles
  const taskTitles = tasks.map(t => t.title);
  expect(taskTitles.some(title => title.includes('Design') || title.includes('Set up') || title.includes('Create'))).toBe(true);
});

test('localStorage updated after every state-modifying action', async ({ page }) => {
  await page.reload();
  
  // Create task
  await page.evaluate(() => {
    window.createTask('Test Task', 'todo');
  });
  
  let storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(4); // 3 defaults + 1 new
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
  expect(storageData).toHaveLength(3);
  
  // Update task
  const remainingTask = storageData[0];
  await page.evaluate((id) => {
    window.updateTask(id, 'Updated Title');
  }, remainingTask.id);
  
  storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData.find(t => t.id === remainingTask.id)?.title).toBe('Updated Title');
});

test('handles malformed JSON with fallback', async ({ page }) => {
  // Set various malformed JSON
  const malformedData = [
    'not json at all',
    '{"incomplete":',
    '[{invalid}]',
    'null',
    'undefined'
  ];
  
  for (const data of malformedData) {
    await page.evaluate((json) => {
      localStorage.setItem('kanban-board-state', json);
    }, data);
    
    await page.reload();
    
    // Verify page still renders
    await expect(page.locator('.board')).toBeVisible();
    
    // Verify can still create tasks
    await page.evaluate(() => {
      window.createTask('Recovery Task', 'todo');
    });
    
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks.length).toBeGreaterThan(0);
    
    // Clear for next iteration
    await page.evaluate(() => localStorage.clear());
  }
});
