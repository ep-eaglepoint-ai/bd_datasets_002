# WC0IQV - Async Event Sourcing Inventory System - Concurrency Bug Fix

**Category:** sft

## Overview
- Task ID: WC0IQV
- Title: Async Event Sourcing Inventory System - Concurrency Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wc0iqv-async-event-sourcing-inventory-system-concurrency-bug-fix

## Requirements
- Stock levels must be accurate after any sequence of concurrent operations. When 100 concurrent tasks perform interleaved add_stock and remove_stock operations on the same inventory item, the final stock count must equal the mathematical sum of all additions minus all removals with zero deviation.
- Event replay must always produce identical state to the current read model. After performing any sequence of operations, calling replay_events on an aggregate and comparing the result to ReadModelProjection.get_stock must return exactly matching values for every item in every aggregate with no exceptions
- Snapshots must capture a consistent point-in-time state. If a snapshot is created at version N, it must include the state reflecting exactly events 1 through N. Replaying events starting from that snapshot must produce identical state to replaying all events from version 0.
- Stock removal operations must be atomic with respect to availability checks. When two concurrent remove_stock calls each attempt to remove 3 units from an item with only 5 units available, exactly one call must succeed and exactly one call must raise ValueError for insufficient stock. The final stock must be exactly 2 units
- System must handle 500 concurrent async tasks without data corruption. Under sustained load of 500 simultaneous tasks performing mixed operations across 10 aggregates, no task should hang indefinitely, no deadlock should occur, and all final states must be mathematically correct.
- Snapshot creation must not block event processing for other aggregates. While SnapshotWorker creates a snapshot for aggregate A, calling append_event on aggregate B must complete within 100 milliseconds assuming no database latency.
- Event handlers must not block event persistence. If a subscribed handler takes 5 seconds to execute, other events must still persist and other handlers must still receive notifications during that time without waiting
- Read model queries must return consistent data. Calling ReadModelProjection.get_stock while handle_event is processing must never return a partially updated state where some fields reflect the new event and others do not
- No external event sourcing frameworks permitted. Solution must use only Python standard library, asyncio, and asyncpg.
- Backward compatibility with existing event format required. Event and Snapshot dataclass structures must remain unchanged. Existing persisted events and snapshots must continue to load and replay correctly
- All concurrency control must be implemented in Python. Database-level locking such as SELECT FOR UPDATE or PostgreSQL advisory locks are not permitted as primary synchronization mechanism
- Existing test suite must continue to pass. Any changes to method signatures must maintain backward compatibility with existing callers that do not use new parameters.

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
