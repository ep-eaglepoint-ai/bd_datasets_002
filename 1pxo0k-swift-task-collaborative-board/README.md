# 1PXO0K - swift-Task-Collaborative-Board

**Category:** sft

## Overview
- Task ID: 1PXO0K
- Title: swift-Task-Collaborative-Board
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1pxo0k-swift-task-collaborative-board

## Requirements
- Conflict Detection (Versioning): Every task in the Prisma schema must include an `updatedAt` timestamp or `version` integer. The Server Action for updating a task must verify this value matches the version held by the client before committing changes.
- Server-Side State Management: All Prisma interactions must be isolated in Next.js Server Actions. The client-side code should only send the task ID and the proposed changes; the server handles all validation and persistence.
- Optimistic UI Feedback: The React frontend should use the `useOptimistic` hook (or equivalent state logic) to immediately update the task's position on the board. If the server returns a conflict error, the task must revert to its pre-update state.
- Concurrency Handling: If two users attempt to move the same task to different columns simultaneously, the database transaction must ensure that only the first request succeeds and the second is rejected due to a version mismatch.
- Data Integrity: Implement a check to ensure tasks cannot be moved to an invalid status. The status field must be restricted to the specified 'To Do', 'In Progress', or 'Done' values.
- Testing Requirement (Stale Update): Simulate a scenario where User A fetches a task, then User B updates that task's title. When User A tries to change the status, verify the server rejects the request because User A's version is now stale.
- Testing Requirement (UI Reversion): Verify that if the network is toggled to 'Offline' and a task is moved, the Optimistic UI correctly rolls the task back to its original column after the request fails.

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: Next.js
- Libraries: Prisma
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
