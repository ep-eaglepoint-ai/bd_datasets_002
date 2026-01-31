# Trajectory

# Enhancement Trajectory – React Kanban Board

## Baseline State (repository_before)
The baseline implementation provided a minimal Kanban board with:
- Two columns (In-Progress and Completed)
- Static task data
- Basic HTML5 drag-and-drop
- No persistence
- No task lifecycle management

The baseline intentionally lacks advanced functionality and serves as a control reference.

---

## Enhancement Goals
The enhancement focuses on improving usability, data durability, and task management while:
- Preserving existing drag-and-drop behavior
- Maintaining the original task data structure
- Avoiding external dependencies
- Remaining keyboard accessible

---

## Implemented Enhancements (repository_after)

### 1. Task Creation via Modal
- Add Task button added per column
- Keyboard accessible modal (Tab / Enter / Escape)
- Auto-generated unique STORY-XXXX IDs
- Priority-based background coloring
- Column-aware task placement

### 2. Inline Task Editing
- Double-click to edit title
- Drag temporarily disabled during editing
- Save on Enter or blur
- Cancel on Escape
- Empty titles safely rejected

### 3. Safe Task Deletion
- Hover-only delete icon
- Confirmation tooltip
- Outside click closes confirmation
- Preserves remaining task order

### 4. Priority Management
- Visual priority indicator
- Right-click context menu
- Dynamic background updates
- Menu closes on outside click or drag start

### 5. Persistent State
- Full localStorage persistence
- Graceful fallback when storage unavailable
- Auto-rehydration on page load

---

## Validation Strategy
- Jest + jsdom based UI tests
- Baseline allowed to have zero tests
- Enhanced implementation must pass all tests
- Evaluation enforces improvement gate

---

## Outcome
The enhanced implementation delivers a full task lifecycle system while preserving all original interactions and constraints, demonstrating measurable improvement over the baseline.
