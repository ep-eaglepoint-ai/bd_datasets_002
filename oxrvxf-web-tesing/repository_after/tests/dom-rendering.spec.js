const { test, expect } = require('@playwright/test');

test.describe('DOM Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      window.tasks = [];
      window.renderAllTasks();
    });
  });

  test('should render task counts correctly', async ({ page }) => {
    // Create tasks in different columns
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo 2', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Progress 1', column: 'progress' });

    await page.waitForSelector('.task-count', { timeout: 5000 });

    // Must use page.locator('.task').count() that the correct number of tasks appear in each column
    const todoTasks = page.locator('#todo-tasks .task');
    const progressTasks = page.locator('#progress-tasks .task');
    const doneTasks = page.locator('#done-tasks .task');
    
    await expect(todoTasks).toHaveCount(2);
    await expect(progressTasks).toHaveCount(1);
    await expect(doneTasks).toHaveCount(0);

    // Must use expect(page.locator('[data-count="todo"]')).toHaveText() to verify task count badges accurately reflect the number of tasks
    await expect(page.locator('[data-count="todo"]')).toHaveText('2');
    await expect(page.locator('[data-count="progress"]')).toHaveText('1');
    await expect(page.locator('[data-count="done"]')).toHaveText('0');
  });

  test('should show empty state when column has no tasks', async ({ page }) => {
    await page.evaluate(() => {
      window.renderAllTasks();
    });

    await page.waitForSelector('.tasks', { timeout: 5000 });

    // Must verify that empty columns display the empty state message using expect(page.locator('#todo-tasks .empty-state')).toBeVisible()
    const emptyState = page.locator('#todo-tasks .empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No tasks yet');
  });

  test('should render task HTML structure correctly', async ({ page }) => {
    const createdTask = await page.evaluate(({ title, column }) => {
      const task = window.createTask(title, column);
      window.renderAllTasks();
      return task;
    }, { title: 'Test task', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const task = page.locator('.task').first();
    
    // Must verify proper HTML structure by checking data-id attributes exist on all task elements
    await expect(task).toHaveAttribute('data-id', createdTask.id);
    await expect(task).toHaveAttribute('draggable', 'true');
    await expect(task.locator('.task-content')).toBeVisible();
    await expect(task.locator('.task-title')).toBeVisible();
    // task-edit-input is hidden by default (display: none), so check if it exists in DOM instead of visibility
    await expect(task.locator('.task-edit-input')).toHaveCount(1);
    await expect(task.locator('.task-delete')).toBeVisible();
  });

  test('should update counts after task deletion', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 1', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Task 2', column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    let todoCount = await page.locator('[data-count="todo"]').textContent();
    expect(todoCount).toBe('2');

    // Delete a task
    const task = page.locator('.task').first();
    await task.hover();
    await task.locator('.task-delete').click();
    await page.waitForTimeout(200);

    todoCount = await page.locator('[data-count="todo"]').textContent();
    expect(todoCount).toBe('1');
  });

  test('should escape HTML in task titles', async ({ page }) => {
    // Must verify using page.evaluate() that task titles containing special HTML characters like angle brackets and ampersands are escaped
    const htmlTitle = '<script>alert("xss")</script>';
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: htmlTitle, column: 'todo' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const taskTitle = page.locator('.task-title').first();
    
    // Must verify by checking element.textContent versus element.innerHTML
    // Use page.evaluate() to get both properties directly from the DOM element
    const content = await taskTitle.evaluate((el) => {
      return {
        textContent: el.textContent,
        innerHTML: el.innerHTML
      };
    });
    
    // Critical verification: innerHTML should contain escaped entities (&lt; and &gt;), not raw HTML tags
    // This is the key security check - if HTML is properly escaped, innerHTML will have entities
    // The requirement says to check element.textContent versus element.innerHTML
    // innerHTML with escaped entities means the HTML is safe (not executable)
    expect(content.innerHTML).not.toContain('<script>');
    expect(content.innerHTML).not.toContain('</script>');
    // Must verify escaped entities are present (this confirms HTML was escaped and rendered as text)
    expect(content.innerHTML).toContain('&lt;');
    expect(content.innerHTML).toContain('&gt;');
    
    // textContent shows the decoded text content
    // When HTML is escaped as &lt;script&gt; in innerHTML, the browser decodes it in textContent
    // So textContent will show <script> as text (not executable), which is correct behavior
    // The requirement says "rendered as text not HTML" - this means innerHTML has entities (text), not raw tags (HTML)
    expect(content.textContent).toContain('alert');
    
    // Verify the script didn't execute - if it did, the page would be broken or alert would show
    // Check that the page is still functional (script execution would break things)
    const pageFunctional = await page.evaluate(() => {
      return typeof window.createTask === 'function' && 
             typeof window.tasks !== 'undefined';
    });
    expect(pageFunctional).toBe(true);
  });

  test('should render tasks in correct columns', async ({ page }) => {
    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Todo task', column: 'todo' });

    await page.evaluate(({ title, column }) => {
      window.createTask(title, column);
      window.renderAllTasks();
    }, { title: 'Progress task', column: 'progress' });

    await page.waitForSelector('.task', { timeout: 5000 });

    const todoTasks = page.locator('#todo-tasks .task');
    const progressTasks = page.locator('#progress-tasks .task');
    const doneTasks = page.locator('#done-tasks .task');

    await expect(todoTasks).toHaveCount(1);
    await expect(progressTasks).toHaveCount(1);
    await expect(doneTasks).toHaveCount(0);
  });
});
