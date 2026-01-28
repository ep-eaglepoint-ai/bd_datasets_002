# XXNH66 - Task Manager API Refactor

**Category:** sft

## Overview
- Task ID: XXNH66
- Title: Task Manager API Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xxnh66-task-manager-api-refactor

## Requirements
- All operations must be safe under concurrent load.
- Must pass Go race detector (go test -race) with zero warnings.
- No unbounded goroutines or channel deadlocks.
- Each task must have a unique ID.
- Title and description cannot be empty.
- Status must be exactly "Pending", "In Progress", or "Completed".
- Due dates must be realistic (≥ Jan 1, 2000 and ≤ 10 years from now).
- Deleted tasks must be fully removed from memory, never reappear.
- POST /tasks → returns full task object (ID, Title, Description, DueDate, Status).
- PUT /tasks/:id → returns updated full task object.
- GET endpoints must return consistent results, no phantom or duplicate tasks.
- All lookups and updates must maintain consistent response times regardless of task volume.
- Memory usage must remain stable under sustained operations.
- No O(n²) complexity in critical paths; no unbounded slices/maps.
- In-memory storage only; no external DB.
- Cannot change HTTP paths, methods, or JSON field names.

## Metadata
- Programming Languages: Go
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
