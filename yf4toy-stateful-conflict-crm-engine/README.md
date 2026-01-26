# YF4TOY - Stateful-Conflict-Crm-Engine

**Category:** sft

## Overview
- Task ID: YF4TOY
- Title: Stateful-Conflict-Crm-Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: yf4toy-stateful-conflict-crm-engine

## Requirements
- Backend Model base: Define a `Lead` structure in Go containing `ID`, `Name`, `Email`, `LeadScore` (int), `Status` (PROSPECT, QUALIFIED, CONVERTED), and a `Version` (int64) field.
- Optimistic Locking Logic: Every update (POST/PATCH) must include the version number the client last observed. The backend must perform a 'Compare-and-Swap' style update: `UPDATE leads SET ..., version = version + 1 WHERE id = ? AND version = ?`. If zero rows are affected, the system must recognize this as a concurrency conflict.
- State Machine Constraints: Implement a hard constraint where the transition to 'CONVERTED' is only permitted if `LeadScore >= 80`. This must be validated server-side during the update transaction; invalid transitions must return a 422 Unprocessable Entity status.
- HTMX Integration: The frontend must be a single Go HTML template. Use `hx-post` for updates and `hx-target` to define where error messages or success states are injected. In the event of a 409 Conflict, the server must return an HTML fragment containing the current 'Fresh' data from the database and a warning message.
- Transactional Integrity: All checks (version validation and score thresholds) and the final update must occur within a single database transaction to prevent race conditions between the check and the write.
- Search & Filter: Implement a server-side search using HTMX `hx-trigger=\"keyup changed delay:500ms\"`. The backend must return only the table rows matching the query, utilizing the `hx-select` or direct partial rendering to update the list view.
- Testing: Provide a Go test suite. Requirement 1: Use `sync.WaitGroup` to simulate 10 concurrent goroutines attempting to update the same lead's score; verify that the version increases correctly and that only one update succeeds for each unique version step. Requirement 2: Attempt to convert a lead with a score of 79 and verify the transition is rejected with a clear business logic error. Requirement 3: Verify that an update with an expired version returns an HTTP 409 status and the latest data payload.

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
