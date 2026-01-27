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
    // and rendered as text not HTML by checking element.textContent versus element.innerHTML
    const specialTitle = 'Task with <angle> brackets & ampersands';
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
    const textContent = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent : null;
    }, '.task-title');
    
    const innerHTML = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? el.innerHTML : null;
    }, '.task-title');
    
    // textContent should contain the literal text as the user sees it
    expect(textContent).toBe('Task with <angle> brackets & ampersands');
    expect(textContent).toContain('<angle>');
    expect(textContent).toContain('&');
    
    // innerHTML should be escaped - raw HTML tags should NOT appear
    // The innerHTML should contain escaped entities, not raw <angle>
    expect(innerHTML).not.toContain('<angle>');
    expect(innerHTML).not.toContain('<tags>');
    expect(innerHTML).not.toContain('<script>');
    
    // Should contain escaped versions of angle brackets
    expect(innerHTML).toContain('&lt;');
    expect(innerHTML).toContain('&gt;');
    
    // Ampersand should be escaped as &amp; in innerHTML
    // But textContent shows the literal & character
    expect(innerHTML).toContain('&amp;');
    expect(textContent).toContain('&');
    
    // Verify innerHTML does not contain unescaped angle brackets that could be interpreted as HTML
    // This ensures the content is rendered as text, not HTML
    const hasUnescapedAngleBrackets = /<[^&]/.test(innerHTML) && !innerHTML.includes('&lt;');
    expect(hasUnescapedAngleBrackets).toBe(false);
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
    const quotaExceeded = await page.evaluate(() => {
      localStorage.clear();
      // Try to fill localStorage near quota
      const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB chunks
      let quotaExceeded = false;
      try {
        for (let i = 0; i < 20; i++) {
          localStorage.setItem(`test-${i}`, largeData);
        }
      } catch (e) {
        // Quota exceeded, that's expected
        quotaExceeded = true;
      }
      return quotaExceeded;
    });

    // App should still function and render - verify page still renders
    const board = page.locator('#board');
    await expect(board).toBeVisible();
    
    // Try to create a task - app should handle storage full condition gracefully
    // The app should not crash even if localStorage.setItem fails
    const task = await page.evaluate(({ title, column }) => {
      try {
        return window.createTask(title, column);
      } catch (e) {
        // If storage fails, app should handle gracefully
        return null;
      }
    }, { title: 'Test task', column: 'todo' });
    
    // Verify app still functions - tasks array should exist
    const tasks = await page.evaluate(() => {
      return Array.isArray(window.tasks);
    });
    expect(tasks).toBe(true);
    
    // Verify the page is still functional - can interact with UI
    const addButton = page.locator('[data-column="todo"] .add-task-btn');
    await expect(addButton).toBeVisible();
    
    // Verify app handles the error gracefully without crashing
    // The board should still be visible and functional
    await expect(board).toBeVisible();
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

  test('should handle Promise.all() with multiple rapid sequential drag operations without state corruption', async ({ page }) => {
    // Must use Promise.all() with multiple rapid sequential drag operations to verify the application handles race conditions without corrupting state
    // Create multiple tasks in different columns
    const tasks = await Promise.all([
      page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: 'Task 1', column: 'todo' }),
      page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: 'Task 2', column: 'todo' }),
      page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: 'Task 3', column: 'progress' }),
      page.evaluate(({ title, column }) => {
        return window.createTask(title, column);
      }, { title: 'Task 4', column: 'progress' }),
    ]);

    // Render all tasks
    await page.evaluate(() => {
      window.renderAllTasks();
    });
    await page.waitForSelector('.task', { timeout: 5000 });

    // Get initial state
    const initialTasks = await page.evaluate(() => window.tasks);
    const initialTaskIds = initialTasks.map(t => t.id);
    expect(initialTasks).toHaveLength(4);

    // Get column locators
    const todoColumn = page.locator('#todo-tasks');
    const progressColumn = page.locator('#progress-tasks');
    const doneColumn = page.locator('#done-tasks');

    // Must use Promise.all() with multiple rapid sequential drag operations
    const dragPromises = [];
    
    // Drag task 1 from todo to progress
    dragPromises.push(
      page.locator(`[data-id="${tasks[0].id}"]`).dragTo(progressColumn)
    );
    
    // Drag task 2 from todo to done
    dragPromises.push(
      page.locator(`[data-id="${tasks[1].id}"]`).dragTo(doneColumn)
    );
    
    // Drag task 3 from progress to todo
    dragPromises.push(
      page.locator(`[data-id="${tasks[2].id}"]`).dragTo(todoColumn)
    );
    
    // Drag task 4 from progress to done
    dragPromises.push(
      page.locator(`[data-id="${tasks[3].id}"]`).dragTo(doneColumn)
    );

    // Execute all drag operations concurrently using Promise.all()
    await Promise.all(dragPromises);
    
    // Wait for state to settle
    await page.waitForTimeout(500);

    // Verify no state corruption - all tasks should still exist
    const finalTasks = await page.evaluate(() => window.tasks);
    expect(finalTasks).toHaveLength(4);
    
    // Verify all original task IDs are still present (no tasks lost)
    const finalTaskIds = finalTasks.map(t => t.id);
    for (const originalId of initialTaskIds) {
      expect(finalTaskIds).toContain(originalId);
    }
    
    // Verify no duplicate tasks (all IDs are unique)
    const uniqueIds = new Set(finalTaskIds);
    expect(uniqueIds.size).toBe(4);
    
    // Verify tasks are in correct columns after drag operations
    const todoTasks = finalTasks.filter(t => t.column === 'todo');
    const progressTasks = finalTasks.filter(t => t.column === 'progress');
    const doneTasks = finalTasks.filter(t => t.column === 'done');
    
    // Task 1 should be in progress
    expect(finalTasks.find(t => t.id === tasks[0].id)?.column).toBe('progress');
    // Task 2 should be in done
    expect(finalTasks.find(t => t.id === tasks[1].id)?.column).toBe('done');
    // Task 3 should be in todo
    expect(finalTasks.find(t => t.id === tasks[2].id)?.column).toBe('todo');
    // Task 4 should be in done
    expect(finalTasks.find(t => t.id === tasks[3].id)?.column).toBe('done');
    
    // Verify task properties are intact (no corruption)
    for (const originalTask of tasks) {
      const finalTask = finalTasks.find(t => t.id === originalTask.id);
      expect(finalTask).toBeDefined();
      expect(finalTask.title).toBe(originalTask.title);
      expect(typeof finalTask.id).toBe('string');
      expect(finalTask.id).toMatch(/^task-\d+-[a-z0-9]+$/);
    }
    
    // Verify localStorage contains valid state
    const storageData = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, 'kanban-board-state');
    expect(storageData).toBeTruthy();
    const parsedStorage = JSON.parse(storageData);
    expect(parsedStorage).toHaveLength(4);
    expect(Array.isArray(parsedStorage)).toBe(true);
  });

});
