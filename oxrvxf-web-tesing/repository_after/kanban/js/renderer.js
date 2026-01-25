// Rendering
// ==================

import { getTasksByColumn } from './taskOperations.js';

export function renderAllTasks() {
  ['todo', 'progress', 'done'].forEach(column => {
    renderColumn(column);
  });
  updateAllCounts();
}

export function renderColumn(column) {
  const container = document.getElementById(`${column}-tasks`);
  const columnTasks = getTasksByColumn(column);
  
  container.innerHTML = columnTasks.length === 0 
    ? '<div class="empty-state">No tasks yet</div>'
    : columnTasks.map(task => createTaskHTML(task)).join('');
  
  // Attach event listeners to new task elements
  container.querySelectorAll('.task').forEach(taskEl => {
    if (typeof setupTaskEvents === 'function') {
      setupTaskEvents(taskEl);
    }
  });
}

function createTaskHTML(task) {
  return `
    <div class="task" draggable="true" data-id="${task.id}">
      <div class="task-content">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <input type="text" class="task-edit-input" value="${escapeHtml(task.title)}" maxlength="100">
        <button class="task-delete" aria-label="Delete task">×</button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function updateAllCounts() {
  ['todo', 'progress', 'done'].forEach(column => {
    const count = getTasksByColumn(column).length;
    const countElement = document.querySelector(`[data-count="${column}"]`);
    if (countElement) {
      countElement.textContent = count;
    }
  });
}

// Export setupTaskEvents for use in app.js
export let setupTaskEvents = null;

export function setSetupTaskEvents(fn) {
  setupTaskEvents = fn;
}
