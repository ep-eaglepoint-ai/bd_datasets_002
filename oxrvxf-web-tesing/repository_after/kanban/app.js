// Kanban Board Application
// ========================

const STORAGE_KEY = 'kanban-board-state';

// State
let tasks = [];
let activeColumn = null;
let draggedTask = null;

// DOM Elements
const board = document.getElementById('board');
const modalOverlay = document.getElementById('modal-overlay');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const cancelBtn = document.getElementById('cancel-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAllTasks();
  setupEventListeners();
});

// ==================
// State Management
// ==================

function loadState() {
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

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================
// Task Operations
// ==================

function createTask(title, column) {
  const task = {
    id: generateId(),
    title: title.trim(),
    column
  };
  tasks.push(task);
  saveState();
  return task;
}

function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  saveState();
}

function updateTask(taskId, newTitle) {
  const task = tasks.find(t => t.id === taskId);
  if (task && newTitle.trim()) {
    task.title = newTitle.trim();
    saveState();
  }
}

function moveTask(taskId, newColumn, insertBeforeId = null) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.column = newColumn;
  
  // Reorder if inserting before another task
  if (insertBeforeId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    const beforeIndex = tasks.findIndex(t => t.id === insertBeforeId);
    
    if (taskIndex !== -1 && beforeIndex !== -1) {
      tasks.splice(taskIndex, 1);
      const newBeforeIndex = tasks.findIndex(t => t.id === insertBeforeId);
      tasks.splice(newBeforeIndex, 0, task);
    }
  }
  
  saveState();
}

function getTasksByColumn(column) {
  return tasks.filter(t => t.column === column);
}

// ==================
// Rendering
// ==================

function renderAllTasks() {
  ['todo', 'progress', 'done'].forEach(column => {
    renderColumn(column);
  });
  updateAllCounts();
}

function renderColumn(column) {
  const container = document.getElementById(`${column}-tasks`);
  const columnTasks = getTasksByColumn(column);
  
  container.innerHTML = columnTasks.length === 0 
    ? '<div class="empty-state">No tasks yet</div>'
    : columnTasks.map(task => createTaskHTML(task)).join('');
  
  // Attach event listeners to new task elements
  container.querySelectorAll('.task').forEach(setupTaskEvents);
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

function updateAllCounts() {
  ['todo', 'progress', 'done'].forEach(column => {
    const count = getTasksByColumn(column).length;
    document.querySelector(`[data-count="${column}"]`).textContent = count;
  });
}

// ==================
// Event Listeners
// ==================

function setupEventListeners() {
  // Add task buttons
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.column));
  });

  // Modal events
  taskForm.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Column drag events
  document.querySelectorAll('.tasks').forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
  });
}

function setupTaskEvents(taskEl) {
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
      renderColumn(tasks.find(t => t.id === taskId)?.column || getColumnFromElement(taskEl));
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

function getColumnFromElement(taskEl) {
  return taskEl.closest('.tasks')?.dataset.column || 'todo';
}

// ==================
// Modal Handling
// ==================

function openModal(column) {
  activeColumn = column;
  modalOverlay.classList.add('active');
  taskInput.value = '';
  setTimeout(() => taskInput.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  activeColumn = null;
  taskInput.value = '';
}

function handleFormSubmit(e) {
  e.preventDefault();
  const title = taskInput.value.trim();
  
  if (!title || !activeColumn) return;
  
  createTask(title, activeColumn);
  renderColumn(activeColumn);
  updateAllCounts();
  closeModal();
}

// ==================
// Task Editing
// ==================

function startEditing(taskEl) {
  taskEl.classList.add('editing');
  const input = taskEl.querySelector('.task-edit-input');
  const title = taskEl.querySelector('.task-title');
  input.value = title.textContent;
  input.focus();
  input.select();
}

function finishEditing(taskEl, newTitle) {
  if (!taskEl.classList.contains('editing')) return;
  
  const taskId = taskEl.dataset.id;
  const trimmed = newTitle.trim();
  
  if (trimmed) {
    updateTask(taskId, trimmed);
    taskEl.querySelector('.task-title').textContent = trimmed;
  }
  
  taskEl.classList.remove('editing');
}

function cancelEditing(taskEl) {
  const task = tasks.find(t => t.id === taskEl.dataset.id);
  if (task) {
    taskEl.querySelector('.task-edit-input').value = task.title;
  }
  taskEl.classList.remove('editing');
}

// ==================
// Drag and Drop
// ==================

function handleDragStart(e) {
  draggedTask = e.target;
  draggedTask.classList.add('dragging');
  
  // Set drag data
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.target.dataset.id);
  
  // Add slight delay for visual feedback
  setTimeout(() => {
    if (draggedTask) draggedTask.style.opacity = '0.4';
  }, 0);
}

function handleDragEnd(e) {
  if (draggedTask) {
    draggedTask.classList.remove('dragging');
    draggedTask.style.opacity = '';
  }
  draggedTask = null;
  
  // Remove all drag-over states
  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
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

function handleDragLeave(e) {
  // Only remove drag-over if we're actually leaving the column
  const column = e.currentTarget.closest('.column');
  const relatedTarget = e.relatedTarget;
  
  if (!column.contains(relatedTarget)) {
    column.classList.remove('drag-over');
  }
}

function handleDrop(e) {
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

// ==================
// Expose functions to window for Playwright testing
// ==================
// This minimal exposure is necessary for testing via page.evaluate()
// and does not change the application logic or structure
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
    set: (value) => { tasks = value; }
  });
}
