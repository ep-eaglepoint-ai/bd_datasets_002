const { test, expect } = require('@playwright/test');

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });
  });

  test('should handle very long task titles (100 char limit)', async ({ page }) => {
    const longTitle = 'A'.repeat(100);
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: longTitle, column: 'todo' });

    expect(task.title).toBe(longTitle);
    expect(task.title.length).toBe(100);

    // Verify it's stored
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title.length).toBe(100);
  });

  test('should handle special characters in task titles', async ({ page }) => {
    const specialTitle = 'Task with "quotes" & <tags> and émojis 🎉';
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: specialTitle, column: 'todo' });

    expect(task.title).toBe(specialTitle);

    // Verify HTML escaping works
    await page.evaluate(() => {
      window.renderAllTasks();
    });
    await page.waitForSelector('.task', { timeout: 5000 });

    const taskTitle = page.locator('.task-title').first();
    const textContent = await taskTitle.textContent();
    expect(textContent).toContain('quotes');
    expect(textContent).toContain('tags');
  });

  test('should handle rapid task creation', async ({ page }) => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.evaluate(({ title, column }) => {
          return window.createTask(title, column);
        }, { title: `Task ${i}`, column: 'todo' })
      );
    }

    const tasks = await Promise.all(promises);

    // Verify all tasks created
    expect(tasks).toHaveLength(10);
    
    const tasksArray = await page.evaluate(() => window.tasks);
    expect(tasksArray).toHaveLength(10);

    // Verify all IDs are unique
    const ids = tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  test('should handle concurrent operations', async ({ page }) => {
    // Create task
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Concurrent task', column: 'todo' });

    // Perform multiple operations concurrently
    await Promise.all([
      page.evaluate(({ taskId, newTitle }) => {
        window.updateTask(taskId, newTitle);
      }, { taskId: task.id, newTitle: 'Updated 1' }),
      page.evaluate(({ taskId, newColumn }) => {
        window.moveTask(taskId, newColumn);
      }, { taskId: task.id, newColumn: 'progress' }),
    ]);

    // Verify final state
    const tasks = await page.evaluate(() => window.tasks);
    const finalTask = tasks.find(t => t.id === task.id);
    expect(finalTask).toBeDefined();
    expect(finalTask.column).toBe('progress');
  });

  test('should handle localStorage quota exceeded gracefully', async ({ page }) => {
    // Try to create many tasks
    for (let i = 0; i < 100; i++) {
      try {
        await page.evaluate(({ title, column }) => {
          window.createTask(title, column);
        }, { title: `Task ${i}`, column: 'todo' });
      } catch (e) {
        // Quota might be exceeded, that's okay
        break;
      }
    }

    // App should still function
    const tasks = await page.evaluate(() => window.tasks);
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('should handle invalid column names', async ({ page }) => {
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task', column: 'invalid-column' });

    expect(task.column).toBe('invalid-column');

    // Should still be stored
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks).toHaveLength(1);
  });

  test('should handle task with only whitespace', async ({ page }) => {
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: '   \n\t   ', column: 'todo' });

    expect(task.title).toBe('');
    
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title).toBe('');
  });

  test('should handle moving task to same position', async ({ page }) => {
    const task1 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 1', column: 'todo' });

    const task2 = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: 'Task 2', column: 'todo' });

    // Move task1 before task2 (already before)
    await page.evaluate(({ taskId, newColumn, insertBeforeId }) => {
      window.moveTask(taskId, newColumn, insertBeforeId);
    }, { taskId: task1.id, newColumn: 'todo', insertBeforeId: task2.id });

    const tasks = await page.evaluate((column) => {
      return window.getTasksByColumn(column);
    }, 'todo');
    expect(tasks).toHaveLength(2);
  });
});
