# ZTK83A - Personal Task Tracker Module

**Category:** sft

## Overview
- Task ID: ZTK83A
- Title: Personal Task Tracker Module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ztk83a-personal-task-tracker-module

## Requirements
- Task Representation: Each task should have the following attributes: title, description, due_date, priority, and status (with values such as pending or completed).
- Add a New Task: Provide a function to add a new task. It should accept all the necessary task attributes (title, description, due_date, priority, and status) and store them appropriately.
- Mark a Task as Completed: Provide a function that allows users to mark a task as completed. This should change the status of the task from pending to completed.
- Filter Tasks by Status or Priority: Provide functionality to filter tasks based on their status (e.g., pending, completed) or priority (e.g., high, medium, low).
- Handle Missing or Empty Data: Ensure the system safely handles cases where input data is missing, incomplete, or empty (e.g., an empty description or invalid date format).
- List All Tasks: Implement a function that lists all tasks, showing their title, description, due_date, priority, and status.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
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
