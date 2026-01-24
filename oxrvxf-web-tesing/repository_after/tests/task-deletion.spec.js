// Task Deletion Tests
// Requirement 2: Task deletion tests must use page.evaluate() to confirm that calling deleteTask with a valid 
// task ID removes exactly one task from the tasks array, leaves all other tasks untouched with their original 
// properties intact, updates localStorage immediately after removal, and that calling deleteTask with a 
// non-existent ID does not throw an error and does not modify the tasks array while still updating localStorage 
// to maintain consistency.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('deletes task with valid ID removes exactly one task, preserves other tasks, updates localStorage, and handles non-existent ID gracefully', async ({ page }) => {
  // Create multiple tasks
  const initialTasks = await page.evaluate(() => {
    const task1 = window.createTask('Task 1', 'todo');
    const task2 = window.createTask('Task 2', 'todo');
    const task3 = window.createTask('Task 3', 'progress');
    return [task1, task2, task3];
  });
  
  const initialCount = await page.evaluate(() => window.tasks.length);
  expect(initialCount).toBe(3);
  
  // Store original properties of task2
  const originalTask2 = initialTasks[1];
  
  // Delete one task using page.evaluate()
  await page.evaluate((taskId) => {
    window.deleteTask(taskId);
  }, initialTasks[1].id);
  
  // Verify exactly one task was removed
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(2);
  
  // Verify other tasks remain untouched with original properties intact
  expect(finalTasks.find(t => t.id === initialTasks[0].id)).toBeDefined();
  expect(finalTasks.find(t => t.id === initialTasks[2].id)).toBeDefined();
  const remainingTask2 = finalTasks.find(t => t.id === initialTasks[0].id);
  expect(remainingTask2.title).toBe('Task 1');
  expect(remainingTask2.column).toBe('todo');
  
  // Verify localStorage updated immediately after removal
  const storageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(storageData).toHaveLength(2);
  expect(storageData.find(t => t.id === initialTasks[1].id)).toBeUndefined();
  
  // Test that calling deleteTask with non-existent ID does not throw error and does not modify tasks array
  const tasksBeforeNonExistent = await page.evaluate(() => window.tasks.length);
  await page.evaluate((nonExistentId) => {
    window.deleteTask(nonExistentId);
  }, 'task-nonexistent-123');
  
  // Verify tasks array not modified
  const tasksAfterNonExistent = await page.evaluate(() => window.tasks);
  expect(tasksAfterNonExistent).toHaveLength(2);
  
  // Verify localStorage still updated to maintain consistency
  const finalStorageData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  expect(finalStorageData).toHaveLength(2);
});
