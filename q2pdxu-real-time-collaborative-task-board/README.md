# Q2PDXU - Real Time Collaborative Task Board

**Category:** sft

## Overview
- Task ID: Q2PDXU
- Title: Real Time Collaborative Task Board
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: q2pdxu-real-time-collaborative-task-board

## Requirements
- Users must register with email and password and login to receive a JWT token. All API endpoints except register and login must require a valid JWT in the Authorization header. Invalid or expired tokens must return 401 Unauthorized.
- Authenticated users can create boards, view their own boards, and access boards they are members of. Each new board must be created with three default columns: "To Do", "In Progress", and "Done".
- Users can create tasks in any column with a title and optional description. Tasks can be updated, deleted, and each task maintains a position within its column for ordering purposes.
- When any user creates, updates, moves, or deletes a task, all other users currently viewing the same board must see the change within 500ms without refreshing the page. Changes must be delivered via WebSocket connection.
- WebSocket connections must be scoped to specific boards. Users viewing Board A must not receive any messages about changes happening on Board B. Each board operates as an independent room.
- When a user connects to a board's WebSocket, all other users on that board must receive a "user_joined" event with the user's information. When a user disconnects, a "user_left" event must be broadcast. Active users should be visible in the UI.
- f a WebSocket connection drops and reconnects, the client must automatically receive the current board state (all columns and tasks) without requiring manual page refresh. The UI must update to reflect any changes that occurred during disconnection.
- When a WebSocket connection closes, the server must remove that connection from all room subscriptions. Empty rooms (no active connections) must be cleaned up to prevent memory leaks. Stale connections must not accumulate over time.
- When two users simultaneously modify the same task or move tasks to the same position, the server must handle the conflict gracefully. The final state must be consistent across all connected clients.
- Backend must use Go 1.21+ with gorilla/websocket for WebSocket handling. Frontend must use React 18 with a drag-and-drop library. Database must be PostgreSQL. Authentication must use JWT tokens.
- A single docker-compose up command must start PostgreSQL, the Go backend, and the React frontend. The frontend must be accessible at localhost:3000, and the API at localhost:8080. No manual setup steps required beyond the single command.

## Metadata
- Programming Languages: Go , Typescript
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
