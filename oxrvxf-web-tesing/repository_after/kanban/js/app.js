// Kanban Board Application - Main Entry Point
// ========================

import { loadState, tasks, setTasks, getActiveColumn, setActiveColumn } from './state.js';
import { createTask, deleteTask, getTasksByColumn, updateTask, moveTask } from './taskOperations.js';
import { renderAllTasks, renderColumn, setSetupTaskEvents, updateAllCounts } from './renderer.js';
import { openModal, closeModal, setupModalListeners } from './modal.js';
import { setupDragDropListeners, handleDragStart, handleDragEnd } from './dragDrop.js';
import { startEditing, finishEditing, cancelEditing, getColumnFromElement } from './taskEditing.js';
import { saveState, generateId, STORAGE_KEY } from './state.js';

// DOM Elements
const board = document.getElementById('board');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAllTasks();
  setupEventListeners();
});

// ==================
// Event Listeners Setup
// ==================

function setupEventListeners() {
  // Add task buttons
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const column = btn.dataset.column;
      setActiveColumn(column);
      openModal(column);
    });
  });

  // Modal events
  setupModalListeners();

  // Drag and drop events
  setupDragDropListeners();

  // Setup task event handlers
  setSetupTaskEvents(setupTaskEventsHandler);
}

function setupTaskEventsHandler(taskEl) {
  const taskId = taskEl.dataset.id;
  
  // Drag events
  taskEl.addEventListener('dragstart', handleDragStart);
  taskEl.addEventListener('dragend', handleDragEnd);
  
  // Delete button
  taskEl.querySelector('.task-delete').addEventListener('click', () => {
    taskEl.style.transform = 'scale(0.9)';
    taskEl.style.opacity = '0';
    setTimeout(() => {
      deleteTask(taskId);
      const column = tasks.find(t => t.id === taskId)?.column || getColumnFromElement(taskEl);
      renderColumn(column);
      updateAllCounts();
    }, 150);
  });
  
  // Double click to edit
  taskEl.addEventListener('dblclick', () => startEditing(taskEl));
  
  // Edit input events
  const input = taskEl.querySelector('.task-edit-input');
  input.addEventListener('blur', () => finishEditing(taskEl, input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing(taskEl, input.value);
    }
    if (e.key === 'Escape') {
      cancelEditing(taskEl);
    }
  });
}

// ==================
// Expose functions to window for Playwright testing
// ==================
if (typeof window !== 'undefined') {
  window.createTask = createTask;
  window.deleteTask = deleteTask;
  window.updateTask = updateTask;
  window.moveTask = moveTask;
  window.getTasksByColumn = getTasksByColumn;
  window.loadState = loadState;
  window.saveState = saveState;
  window.generateId = generateId;
  window.renderAllTasks = renderAllTasks;
  window.renderColumn = renderColumn;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.STORAGE_KEY = STORAGE_KEY;
  
  // Expose tasks array via getter/setter for state inspection
  Object.defineProperty(window, 'tasks', {
    get: () => tasks,
    set: (value) => { setTasks(value); }
  });
}
