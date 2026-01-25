// Task Editing
// ==================

import { tasks } from './state.js';
import { updateTask } from './taskOperations.js';

export function startEditing(taskEl) {
  taskEl.classList.add('editing');
  const input = taskEl.querySelector('.task-edit-input');
  const title = taskEl.querySelector('.task-title');
  input.value = title.textContent;
  input.focus();
  input.select();
}

export function finishEditing(taskEl, newTitle) {
  if (!taskEl.classList.contains('editing')) return;
  
  const taskId = taskEl.dataset.id;
  const trimmed = newTitle.trim();
  
  if (trimmed) {
    updateTask(taskId, trimmed);
    taskEl.querySelector('.task-title').textContent = trimmed;
  }
  
  taskEl.classList.remove('editing');
}

export function cancelEditing(taskEl) {
  const task = tasks.find(t => t.id === taskEl.dataset.id);
  if (task) {
    taskEl.querySelector('.task-edit-input').value = task.title;
  }
  taskEl.classList.remove('editing');
}

export function getColumnFromElement(taskEl) {
  return taskEl.closest('.tasks')?.dataset.column || 'todo';
}
