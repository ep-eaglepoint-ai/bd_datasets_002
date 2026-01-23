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

test('deletes task with valid ID and handles non-existent ID gracefully', async ({ page }) => {
  // Create multiple tasks
  const taskIds = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'progress');
    return [t1.id, t2.id, t3.id];
  });
  
  const initialTasks = await page.evaluate(() => window.tasks);
  const ourInitialTasks = initialTasks.filter(t => taskIds.includes(t.id));
  expect(ourInitialTasks).toHaveLength(3);
  
  // Delete one task
  await page.evaluate((taskId) => {
    window.deleteTask(taskId);
  }, taskIds[1]);
  
  // Verify exactly one task was removed
  const afterDelete = await page.evaluate(() => window.tasks);
  const ourAfterDelete = afterDelete.filter(t => taskIds.includes(t.id));
  expect(ourAfterDelete).toHaveLength(2);
  expect(ourAfterDelete.find(t => t.id === taskIds[1])).toBeUndefined();
  
  // Verify other tasks remain untouched
  expect(ourAfterDelete.find(t => t.id === taskIds[0])).toBeDefined();
  expect(ourAfterDelete.find(t => t.id === taskIds[2])).toBeDefined();
  
  // Verify localStorage was updated
  const stored = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('kanban-board-state') || '[]');
  });
  const ourStored = stored.filter(t => taskIds.includes(t.id));
  expect(ourStored).toHaveLength(2);
  
  // Test deleting non-existent ID does not throw error
  await page.evaluate(() => {
    window.deleteTask('non-existent-id');
  });
  
  // Verify tasks array unchanged
  const finalTasks = await page.evaluate(() => window.tasks);
  const ourFinalTasks = finalTasks.filter(t => taskIds.includes(t.id));
  expect(ourFinalTasks).toHaveLength(2);
});
