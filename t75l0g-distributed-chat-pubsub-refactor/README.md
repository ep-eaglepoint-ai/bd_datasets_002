# T75L0G - Distributed-Chat-PubSub-Refactor

**Category:** sft

## Overview
- Task ID: T75L0G
- Title: Distributed-Chat-PubSub-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: t75l0g-distributed-chat-pubsub-refactor

## Requirements
- Integration: Integrate a Redis client (e.g., `ioredis`) to handle `PUBLISH`, `SUBSCRIBE`, and `UNSUBSCRIBE` operations. You must use separate Redis connections for publishing and subscribing.
- Decoupled Broadcasting: When a `send_message` event is received, the server must publish the payload to a Redis channel corresponding to the room name instead of emitting directly via `this.io.to(room)`.
- Global Listener: Implement a global subscription listener that monitors all room channels. When a message arrives from Redis, the server must identify if it has any local clients in that room and emit the message to them.
- State Management: Replace the local `rooms` Map with a distributed strategy. You must be able to query whether a room is 'active' globally (i.e., has at least one participant on any server node) using Redis keys with appropriate TTLs.
- Resilience: Implement error handling for Redis connection drops. If the Redis client is disconnected, the service should attempt to re-establish subscriptions for all currently active local rooms without losing message integrity.
- Serialization: Ensure all data passed through Redis is correctly serialized/deserialized and includes a unique 'Instance ID' to prevent a server from processing its own published messages twice if necessary.
- Testing: Author a test suite. Requirement 1: Simulate two distinct instances of `ChatService` and mock the Redis layer. Requirement 2: Send a message to Instance A and assert that Instance B's socket triggers an emission to its local clients. Requirement 3: Verify that when the last user on all instances leaves a room, the Redis state for that room is cleaned up or expired.

## Metadata
- Programming Languages: JavaScript
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
