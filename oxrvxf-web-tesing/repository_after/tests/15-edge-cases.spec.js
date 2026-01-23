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

test('handles edge cases: HTML escaping, long titles, self-drag, and race conditions', async ({ page }) => {
  // Test HTML character escaping
  const htmlTitle = '<script>alert("xss")</script> & <b>bold</b>';
  const task = await page.evaluate((title) => {
    return window.createTask(title, 'todo');
  }, htmlTitle);
  
  await page.reload();
  const taskElement = page.locator(`[data-id="${task.id}"]`);
  const textContent = await taskElement.locator('.task-title').textContent();
  const innerHTML = await taskElement.locator('.task-title').innerHTML();
  
  expect(textContent).toContain('<script>');
  expect(innerHTML).not.toContain('<script>');
  expect(innerHTML).toContain('&lt;script&gt;');
  
  // Test 100 character title
  const longTitle = 'a'.repeat(100);
  const longTask = await page.evaluate((title) => {
    return window.createTask(title, 'todo');
  }, longTitle);
  
  expect(longTask.title.length).toBe(100);
  await page.reload();
  const longTaskElement = page.locator(`[data-id="${longTask.id}"]`);
  const displayedTitle = await longTaskElement.locator('.task-title').textContent();
  expect(displayedTitle.length).toBe(100);
  
  // Test dragging task onto itself
  const selfDragTaskId = await page.evaluate(() => {
    return window.createTask('Self Drag Test', 'todo').id;
  });
  await page.reload();
  
  const selfDragTask = page.locator(`[data-id="${selfDragTaskId}"]`);
  await selfDragTask.dragTo(selfDragTask);
  await page.waitForTimeout(200);
  
  const tasksAfterSelfDrag = await page.evaluate(() => window.tasks);
  const ourTaskAfterSelfDrag = tasksAfterSelfDrag.find(t => t.id === selfDragTaskId);
  expect(ourTaskAfterSelfDrag).toBeDefined();
  expect(ourTaskAfterSelfDrag.title).toBe('Self Drag Test');
  
  // Test localStorage quota (simplified - just verify it doesn't crash)
  await page.evaluate(() => {
    try {
      const largeData = 'x'.repeat(100000);
      localStorage.setItem('test-data', largeData);
    } catch (e) {
      // Quota exceeded - expected
    }
  });
  
  await expect(page.locator('.board')).toBeVisible();
  
  // Test rapid sequential drag operations
  const rapidTaskIds = await page.evaluate(() => {
    return [
      window.createTask('Task 1', 'todo').id,
      window.createTask('Task 2', 'todo').id,
      window.createTask('Task 3', 'todo').id,
    ];
  });
  await page.reload();
  
  await page.locator(`[data-id="${rapidTaskIds[0]}"]`).dragTo(page.locator('[data-column="progress"] .tasks'));
  await page.waitForTimeout(50);
  await page.locator(`[data-id="${rapidTaskIds[1]}"]`).dragTo(page.locator('[data-column="done"] .tasks'));
  await page.waitForTimeout(50);
  await page.locator(`[data-id="${rapidTaskIds[2]}"]`).dragTo(page.locator('[data-column="progress"] .tasks'));
  await page.waitForTimeout(200);
  
  const allTasks = await page.evaluate(() => window.tasks);
  const ourTasks = allTasks.filter(t => rapidTaskIds.includes(t.id));
  expect(ourTasks).toHaveLength(3);
  
  ourTasks.forEach(task => {
    expect(['todo', 'progress', 'done']).toContain(task.column);
  });
  
  const ids = ourTasks.map(t => t.id);
  expect(new Set(ids).size).toBe(3);
});
