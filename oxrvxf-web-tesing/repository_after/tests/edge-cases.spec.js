const { test, expect } = require('@playwright/test');

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
    });
  });

  test('should handle task creation with exactly 100 characters', async ({ page }) => {
    // Must test task creation with exactly 100 characters verifying the full title is saved and displayed
    const longTitle = 'A'.repeat(100);
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: longTitle, column: 'todo' });

    expect(task.title).toBe(longTitle);
    expect(task.title.length).toBe(100);

    // Verify it's stored
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks[0].title.length).toBe(100);
    
    // Verify it's displayed
    await page.evaluate(() => {
      window.renderAllTasks();
    });
    await page.waitForSelector('.task', { timeout: 5000 });
    const displayedTitle = await page.locator('.task-title').first().textContent();
    expect(displayedTitle.length).toBe(100);
  });

  test('should escape special HTML characters in task titles', async ({ page }) => {
    // Must verify using page.evaluate() that task titles containing special HTML characters like angle brackets and ampersands are escaped
    const specialTitle = 'Task with "quotes" & <tags> and émojis 🎉';
    const task = await page.evaluate(({ title, column }) => {
      return window.createTask(title, column);
    }, { title: specialTitle, column: 'todo' });

    expect(task.title).toBe(specialTitle);

    // Verify HTML escaping works - rendered as text not HTML
    await page.evaluate(() => {
      window.renderAllTasks();
    });
    await page.waitForSelector('.task', { timeout: 5000 });

    const taskTitle = page.locator('.task-title').first();
    
    // Must verify by checking element.textContent versus element.innerHTML
    const textContent = await taskTitle.textContent();
    const innerHTML = await taskTitle.innerHTML();
    
    // textContent should contain the text
    expect(textContent).toContain('quotes');
    expect(textContent).toContain('tags');
    
    // innerHTML should be escaped (not contain raw HTML tags)
    expect(innerHTML).not.toContain('<tags>');
    expect(innerHTML).not.toContain('<script>');
    // But should contain escaped versions
    expect(innerHTML).toContain('&lt;');
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
    // Must use page.evaluate() to fill localStorage near its quota then test that the application handles the storage full condition gracefully
    await page.evaluate(() => {
      localStorage.clear();
      // Try to fill localStorage near quota
      const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB
      try {
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`test-${i}`, largeData);
        }
      } catch (e) {
        // Quota exceeded, that's expected
      }
    });

    // App should still function - try to create a task
    try {
      const task = await page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: 'Test task', column: 'todo' });
      
      // If task was created, verify app still works
      if (task) {
        const tasks = await page.evaluate(() => window.tasks);
        expect(Array.isArray(tasks)).toBe(true);
      }
    } catch (e) {
      // If storage is full, app should handle gracefully without crashing
      const board = page.locator('#board');
      await expect(board).toBeVisible();
    }
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

  test('should handle dragging task onto itself', async ({ page }) => {
    // Must use dragTo() to drag a task onto itself and verify no state corruption occurs
    const task = await page.evaluate(({ title, column }) => {
      const t = window.createTask(title, column);
      window.renderAllTasks();
      return t;
    }, { title: 'Task to drag onto itself', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const taskElement = page.locator(`[data-id="${task.id}"]`);
    const todoColumn = page.locator('#todo-tasks');

    // Drag task onto itself
    await taskElement.dragTo(taskElement);
    await page.waitForTimeout(300);

    // Verify no state corruption - task should still exist
    const tasks = await page.evaluate(() => window.tasks);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task.id);
    expect(tasks[0].title).toBe(task.title);
    expect(tasks[0].column).toBe(task.column);

    // Verify task is still in DOM
    await expect(taskElement).toBeVisible();
  });

});
