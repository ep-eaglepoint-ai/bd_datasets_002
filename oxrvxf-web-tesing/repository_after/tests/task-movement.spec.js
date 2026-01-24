// Task Movement Tests
// Requirement 3: Task movement tests must use page.evaluate() to validate that moveTask correctly updates the 
// column property of the specified task, that when an insertBeforeId is provided the task is repositioned in 
// the array immediately before the target task, that moving a task to its current column and position results 
// in no net change to array order, and that invalid task IDs or column values are handled gracefully without 
// corrupting the tasks array.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Set localStorage to empty array to prevent default tasks from being created
  await page.evaluate(() => {
    localStorage.setItem('kanban-board-state', '[]');
  });
  await page.reload();
});

test('moves task correctly updates column, handles insertBeforeId, handles no-op moves, and handles invalid inputs gracefully', async ({ page }) => {
  // Create tasks
  const tasks = await page.evaluate(() => {
    const t1 = window.createTask('Task 1', 'todo');
    const t2 = window.createTask('Task 2', 'todo');
    const t3 = window.createTask('Task 3', 'progress');
    return [t1, t2, t3];
  });
  
  // Validate that moveTask correctly updates column property using page.evaluate()
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: tasks[0].id, newColumn: 'progress' });
  
  const tasksAfterMove = await page.evaluate(() => window.tasks);
  const movedTask = tasksAfterMove.find(t => t.id === tasks[0].id);
  expect(movedTask.column).toBe('progress');
  
  // Validate that when insertBeforeId is provided, task is repositioned immediately before target task
  await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
    window.moveTask(taskId, newColumn, insertBeforeId);
  }, { taskId: tasks[1].id, newColumn: 'progress', insertBeforeId: tasks[0].id });
  
  const tasksAfterInsert = await page.evaluate(() => window.tasks);
  const task1Index = tasksAfterInsert.findIndex(t => t.id === tasks[0].id);
  const task2Index = tasksAfterInsert.findIndex(t => t.id === tasks[1].id);
  expect(task2Index).toBeLessThan(task1Index);
  expect(task2Index).toBe(task1Index - 1); // Immediately before
  
  // Validate that moving task to current column and position results in no net change
  const orderBeforeNoOp = await page.evaluate(() => {
    return window.tasks.map(t => t.id);
  });
  
  await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
    window.moveTask(taskId, newColumn, insertBeforeId);
  }, { taskId: tasks[1].id, newColumn: 'progress', insertBeforeId: tasks[0].id });
  
  const orderAfterNoOp = await page.evaluate(() => {
    return window.tasks.map(t => t.id);
  });
  expect(orderAfterNoOp).toEqual(orderBeforeNoOp);
  
  // Validate that invalid task IDs are handled gracefully without corrupting tasks array
  const tasksBeforeInvalid = await page.evaluate(() => window.tasks.length);
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: 'invalid-task-id', newColumn: 'progress' });
  
  const tasksAfterInvalid = await page.evaluate(() => window.tasks);
  expect(tasksAfterInvalid).toHaveLength(tasksBeforeInvalid);
  
  // Validate that invalid column values are handled gracefully
  await page.evaluate(({ taskId, newColumn }) => {
    window.moveTask(taskId, newColumn);
  }, { taskId: tasks[0].id, newColumn: 'invalid-column' });
  
  const finalTasks = await page.evaluate(() => window.tasks);
  expect(finalTasks).toHaveLength(tasksBeforeInvalid);
  // Array not corrupted - all tasks still exist
  expect(finalTasks.find(t => t.id === tasks[0].id)).toBeDefined();
  expect(finalTasks.find(t => t.id === tasks[1].id)).toBeDefined();
  expect(finalTasks.find(t => t.id === tasks[2].id)).toBeDefined();
});
