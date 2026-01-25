// Drag and Drop
// ==================

import { setDraggedTask, getDraggedTask } from './state.js';
import { moveTask } from './taskOperations.js';
import { renderAllTasks } from './renderer.js';

export function handleDragStart(e) {
  const taskEl = e.target.closest('.task');
  if (!taskEl) return;
  
  setDraggedTask(taskEl);
  taskEl.classList.add('dragging');
  
  // Set drag data
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskEl.dataset.id);
  
  // Add slight delay for visual feedback
  setTimeout(() => {
    const currentDragged = getDraggedTask();
    if (currentDragged) currentDragged.style.opacity = '0.4';
  }, 0);
}

export function handleDragEnd(e) {
  const currentDragged = getDraggedTask();
  if (currentDragged) {
    currentDragged.classList.remove('dragging');
    currentDragged.style.opacity = '';
  }
  setDraggedTask(null);
  
  // Remove all drag-over states
  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drag-over');
  });
}

export function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const column = e.currentTarget.closest('.column');
  column.classList.add('drag-over');
  
  // Get the task we're hovering over for insertion point
  const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
  const draggingEl = document.querySelector('.dragging');
  
  if (draggingEl && e.currentTarget.contains(draggingEl) === false) {
    // Moving to a different column
    if (afterElement) {
      e.currentTarget.insertBefore(draggingEl, afterElement);
    } else {
      // Remove empty state if present
      const emptyState = e.currentTarget.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      e.currentTarget.appendChild(draggingEl);
    }
  } else if (draggingEl) {
    // Reordering within same column
    if (afterElement && afterElement !== draggingEl) {
      e.currentTarget.insertBefore(draggingEl, afterElement);
    } else if (!afterElement) {
      e.currentTarget.appendChild(draggingEl);
    }
  }
}

export function handleDragLeave(e) {
  // Only remove drag-over if we're actually leaving the column
  const column = e.currentTarget.closest('.column');
  const relatedTarget = e.relatedTarget;
  
  if (!column.contains(relatedTarget)) {
    column.classList.remove('drag-over');
  }
}

export function handleDrop(e) {
  e.preventDefault();
  
  const column = e.currentTarget.closest('.column');
  column.classList.remove('drag-over');
  
  const taskId = e.dataTransfer.getData('text/plain');
  const newColumn = e.currentTarget.dataset.column;
  
  if (!taskId || !newColumn) return;
  
  // Find the task we're inserting before (if any)
  const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
  const insertBeforeId = afterElement?.dataset.id || null;
  
  moveTask(taskId, newColumn, insertBeforeId);
  
  // Re-render all columns to ensure proper state
  renderAllTasks();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Setup drag and drop listeners
export function setupDragDropListeners() {
  // Column drag events
  document.querySelectorAll('.tasks').forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
  });
}
