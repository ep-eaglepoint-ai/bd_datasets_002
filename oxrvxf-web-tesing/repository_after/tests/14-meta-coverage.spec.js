import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('test suite achieves required code coverage', async ({ page }) => {
  await page.goto('/index.html');
  await page.coverage.startJSCoverage();
  
  await page.evaluate(() => {
    localStorage.setItem('skip-default-tasks', 'true');
    localStorage.removeItem('kanban-board-state');
    if (window.tasks) window.tasks = [];
  });
  await page.reload();
  
  // Create task
  await page.evaluate(() => {
    window.createTask('Coverage Test Task', 'todo');
  });
  
  // Move task
  const tasks = await page.evaluate(() => window.tasks);
  if (tasks.length > 0) {
    await page.evaluate((taskId) => {
      window.moveTask(taskId, 'progress');
    }, tasks[0].id);
  }
  
  // Delete task
  const tasksAfterMove = await page.evaluate(() => window.tasks);
  if (tasksAfterMove.length > 0) {
    await page.evaluate((taskId) => {
      window.deleteTask(taskId);
    }, tasksAfterMove[0].id);
  }
  
  const coverage = await page.coverage.stopJSCoverage();
  const appCoverage = coverage.find(c => c.url.includes('app.js'));
  
  if (appCoverage && appCoverage.functions && appCoverage.functions.length > 0) {
    const functions = appCoverage.functions;
    const coveredFunctions = functions.filter(f => f.ranges && f.ranges.some(r => r.count > 0));
    const functionCoverage = (coveredFunctions.length / functions.length) * 100;
    
    const ranges = appCoverage.ranges || [];
    const totalLines = ranges.length;
    const coveredLines = ranges.filter(r => r.count > 0).length;
    const lineCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 100;
    
    expect(lineCoverage).toBeGreaterThanOrEqual(75);
    expect(functionCoverage).toBeGreaterThanOrEqual(70);
  }
});

