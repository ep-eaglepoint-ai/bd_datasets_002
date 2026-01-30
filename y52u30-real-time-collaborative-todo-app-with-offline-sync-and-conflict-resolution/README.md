# Y52U30 - Real-time Collaborative Todo App with Offline Sync and Conflict Resolution

**Category:** sft

## Overview
- Task ID: Y52U30
- Title: Real-time Collaborative Todo App with Offline Sync and Conflict Resolution
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: y52u30-real-time-collaborative-todo-app-with-offline-sync-and-conflict-resolution

## Requirements
- Vector clock comparison must return four distinct results: "before" (clock A causally precedes B), "after" (A causally follows B), "equal" (clocks are identical), and "concurrent" (neither dominates). Returning only three values conflates "equal" with "concurrent", causing the system to treat identical states as conflicts requiring resolution.
- Last-write-wins conflict resolution for concurrent vector clocks must use a deterministic tiebreaker when timestamps are equal. Compare updated_at first; if equal, use lexicographic comparison of updated_by user IDs. This ensures all clients resolve the same conflict identically without requiring coordination.
- WebSocket server in Next.js 14 must use a custom Node.js server or separate WebSocket process. The App Router does not support WebSocket upgrades in API routes - request.socket.server does not exist in this runtime. Attempting to access it throws undefined errors on startup.
- Offline operation queue must use monotonically increasing sequence numbers for ordering, not timestamps. Timestamps can collide when multiple operations occur within the same millisecond, and clock skew between client and server can reorder operations incorrectly. Sequence numbers guarantee replay order matches creation order.
- User presence cleanup must delay 5 seconds after WebSocket disconnect before removing the user's presence record. This handles brief network interruptions during reconnection. Immediate cleanup causes presence to flicker; delays longer than 10 seconds leave ghost indicators.
- Optimistic updates must store the complete previous state before applying changes locally. When the server responds with a conflict or rejection, the client must atomically revert to the stored state, not attempt partial merges. The rollback must trigger exactly one re-render to avoid UI flicker.
- Todo deletion must use soft delete with a deleted_at timestamp column rather than removing rows. Hard deletes cannot sync to offline clients - the deleted item simply appears mi
- Reconnection backoff must use exponential delays starting at 1 second with maximum 30 seconds, plus 20% random jitter. Without jitter, all disconnected clients reconnect simultaneously when the server recovers, causing a thundering herd that can crash the server again.
- Presence update events must be throttled to maximum one emission per 100ms during rapid user interactions like typing. Without throttling, cursor movement and keystroke events flood the WebSocket with presence updates, degrading performance for all connected clients.
- Reorder operations must update vector clocks for all affected todos in a single transaction, not just the moved item. If user A moves item 3 to position 1 while user B edits item 2, the position shift must be trackable through vector clocks to detect and resolve the concurrent modification.
- Sync on reconnection must request only changes since lastSyncTimestamp using a server-side query filter on updated_at. Fetching all todos on every reconnection wastes bandwidth and processing time, especially for large lists. The response should include only todos where updated_at > lastSyncTimestamp.
- Client-generated todo IDs must use crypto.randomUUID() which provides cryptographically random UUIDs. Using Math.random() or timestamp-based IDs risks collisions when multiple offline clients create todos simultaneously, causing one creation to silently overwrite another.

## Metadata
- Programming Languages: Typescript
- Frameworks: Nextjs
- Libraries: (none)
- Databases: postgress
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
