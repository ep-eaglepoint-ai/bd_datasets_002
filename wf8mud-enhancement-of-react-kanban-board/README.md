# WF8MUD - Enhancement of React Kanban Board

**Category:** sft

## Overview
- Task ID: WF8MUD
- Title: Enhancement of React Kanban Board
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wf8mud-enhancement-of-react-kanban-board

## Requirements
- The application must allow users to add new tasks using a modal opened from an “Add Task” button in each column header.
- Newly created tasks must include a required title, optional description, and a selectable priority level.
- Each task must be assigned a unique auto-generated ID following the STORY-XXXX format.
- The background color of a task must be automatically determined based on its priority level.
- Tasks must be added directly to the column from which the “Add Task” action was initiated.
- The modal must support keyboard accessibility and close on submission, outside click, or Escape key press.
- Tasks must support inline editing of the title through a double-click interaction.
- Inline editing must allow saving via Enter, cancellation via Escape, and saving on outside click.
- Editing a task must temporarily disable drag-and-drop behavior for that task.
- Each task must provide a delete option that appears on hover and requires user confirmation before removal.
- Deleting a task must preserve the order of the remaining tasks within the column.
- Each task must display a visual indicator representing its priority level.
- Task priority must be changeable through a right-click context menu, updating both the indicator and background color.
- All task changes, including creation, editing, deletion, reordering, and priority updates, must be persisted to localStorage.
- The application must restore tasks from localStorage on load and handle storage unavailability without errors.

## Metadata
- Programming Languages: JavaScript
- Frameworks: React
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
