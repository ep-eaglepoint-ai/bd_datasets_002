// Modal Handling
// ==================

import { setActiveColumn, getActiveColumn } from './state.js';
import { createTask } from './taskOperations.js';
import { renderColumn, updateAllCounts } from './renderer.js';

const modalOverlay = document.getElementById('modal-overlay');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const cancelBtn = document.getElementById('cancel-btn');

export function openModal(column) {
  setActiveColumn(column);
  modalOverlay.classList.add('active');
  taskInput.value = '';
  setTimeout(() => taskInput.focus(), 100);
}

export function closeModal() {
  modalOverlay.classList.remove('active');
  setActiveColumn(null);
  taskInput.value = '';
}

export function handleFormSubmit(e) {
  e.preventDefault();
  const title = taskInput.value.trim();
  const column = getActiveColumn();
  
  if (!title || !column) return;
  
  createTask(title, column);
  renderColumn(column);
  updateAllCounts();
  closeModal();
}

// Setup modal event listeners
export function setupModalListeners() {
  taskForm.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
