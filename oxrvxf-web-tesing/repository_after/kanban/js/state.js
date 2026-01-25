// State Management
// ==================

export const STORAGE_KEY = 'kanban-board-state';

// State
export let tasks = [];
export let activeColumn = null;
export let draggedTask = null;

export function setTasks(newTasks) {
  tasks = newTasks;
}

export function setActiveColumn(column) {
  activeColumn = column;
}

export function getActiveColumn() {
  return activeColumn;
}

export function setDraggedTask(task) {
  draggedTask = task;
}

export function getDraggedTask() {
  return draggedTask;
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      tasks = JSON.parse(saved);
    } else {
      // Default sample tasks
      tasks = [
        { id: generateId(), title: 'Design the landing page', column: 'todo' },
        { id: generateId(), title: 'Set up project repository', column: 'progress' },
        { id: generateId(), title: 'Create initial wireframes', column: 'done' },
      ];
      saveState();
    }
  } catch (e) {
    console.error('Failed to load state:', e);
    tasks = [];
  }
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
