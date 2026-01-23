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

test('moves task to different column and handles invalid inputs gracefully', async ({ page }) => {
  const taskIds = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'todo');
    return [t1.id, t2.id, t3.id];
  });
  
  // Move task to different column
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: taskIds[0], newColumn: 'progress' });
  
  const tasks = await page.evaluate(() => window.tasks);
  const movedTask = tasks.find(t => t.id === taskIds[0]);
  expect(movedTask.column).toBe('progress');
  
  // Test insertBeforeId repositions in array
  await page.evaluate(({ taskId, insertBeforeId }) => {
    window.moveTask(taskId, 'todo', insertBeforeId);
  }, { taskId: taskIds[2], insertBeforeId: taskIds[1] });
  
  const allTasks = await page.evaluate(() => window.tasks);
  const todoTasks = allTasks.filter(t => t.column === 'todo' && taskIds.includes(t.id));
  expect(todoTasks[0].id).toBe(taskIds[2]);
  expect(todoTasks[1].id).toBe(taskIds[1]);
  
  // Test moving to current column and position results in no change
  const initialOrder = todoTasks.map(t => t.id);
  await page.evaluate(({ taskId, insertBeforeId }) => {
    window.moveTask(taskId, 'todo', insertBeforeId);
  }, { taskId: taskIds[2], insertBeforeId: taskIds[1] });
  
  const finalTasks = await page.evaluate(() => window.tasks);
  const finalTodoTasks = finalTasks.filter(t => t.column === 'todo' && taskIds.includes(t.id));
  const finalOrder = finalTodoTasks.map(t => t.id);
  expect(finalOrder).toEqual(initialOrder);
  
  // Test invalid task ID handled gracefully
  await page.evaluate(() => {
    window.moveTask('invalid-id', 'progress');
  });
  
  // Test invalid column handled gracefully
  await page.evaluate((taskId) => {
    window.moveTask(taskId, 'invalid-column');
  }, taskIds[0]);
  
  const finalTasksAfterInvalid = await page.evaluate(() => window.tasks);
  const ourFinalTasks = finalTasksAfterInvalid.filter(t => taskIds.includes(t.id));
  expect(ourFinalTasks).toHaveLength(3);
});
