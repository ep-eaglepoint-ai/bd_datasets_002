// Task Operations
// ==================

import { tasks, setTasks, saveState, generateId } from './state.js';

export function createTask(title, column) {
  const task = {
    id: generateId(),
    title: title.trim(),
    column
  };
  const newTasks = [...tasks, task];
  setTasks(newTasks);
  saveState();
  return task;
}

export function deleteTask(taskId) {
  const newTasks = tasks.filter(t => t.id !== taskId);
  setTasks(newTasks);
  saveState();
}

export function updateTask(taskId, newTitle) {
  const task = tasks.find(t => t.id === taskId);
  if (task && newTitle.trim()) {
    task.title = newTitle.trim();
    saveState();
  }
}

export function moveTask(taskId, newColumn, insertBeforeId = null) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.column = newColumn;
  
  // Reorder if inserting before another task
  if (insertBeforeId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    const beforeIndex = tasks.findIndex(t => t.id === insertBeforeId);
    
    if (taskIndex !== -1 && beforeIndex !== -1) {
      const newTasks = [...tasks];
      newTasks.splice(taskIndex, 1);
      const newBeforeIndex = newTasks.findIndex(t => t.id === insertBeforeId);
      newTasks.splice(newBeforeIndex, 0, task);
      setTasks(newTasks);
    }
  }
  
  saveState();
}

export function getTasksByColumn(column) {
  return tasks.filter(t => t.column === column);
}
