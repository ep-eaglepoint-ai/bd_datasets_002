# M5PT43 - event sourcing go

**Category:** sft

## Overview
- Task ID: M5PT43
- Title: event sourcing go
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: m5pt43-event-sourcing-go

## Requirements
- Build a PostgreSQL-based event store with append-only event streams per aggregate, optimistic concurrency control using expected version checks, efficient range queries by aggregate ID and version, and global ordering using a sequence number for cross-aggregate projections
- Create a base aggregate interface with methods for applying events, handling commands, and reconstructing state from event history, implementing snapshot support for aggregates with many events, and providing type-safe event application using Go generics
- Implement a command bus supporting synchronous and asynchronous command dispatch, command validation middleware, idempotency handling using command IDs, and automatic retry with configurable policies for transient failures
- Design a projection framework that subscribes to event streams, maintains processing checkpoints for resumability, supports multiple projection instances with partitioning for scalability, and provides rebuild capabilities for correcting or updating projection logic
- Implement event schema evolution through upcasters that transform old event versions to current schemas during replay, supporting field additions, renames, and type changes while maintaining backward compatibility with stored events
- Build the transactional outbox pattern ensuring events are atomically stored with aggregate changes, a background publisher that reliably sends events to NATS with exactly-once semantics, and cleanup of published outbox entries
- Create a saga coordinator for managing long-running business processes spanning multiple aggregates, with compensation handling for rollback scenarios, timeout management, and persistent saga state with recovery after restarts
- Implement comprehensive logging of commands and events with correlation IDs, metrics for event store performance and projection lag, an event browser API for debugging and auditing, and integration with OpenTelemetry for distributed tracing across services

## Metadata
- Programming Languages: go
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
