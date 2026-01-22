# NHGKZR - Async Resource Pool Leak Stabilization and Bounded Cleanup

**Category:** sft

## Overview
- Task ID: NHGKZR
- Title: Async Resource Pool Leak Stabilization and Bounded Cleanup
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nhgkzr-async-resource-pool-leak-stabilization-and-bounded-cleanup

## Requirements
- All async tasks must complete or be cancelled within bounded time: after a load spike ends, the total async task count must return to baseline (±20) within 60 seconds, including tasks that were spawned but not awaited, tasks blocked on I/O, or tasks interrupted by cancellation.
- The application must enforce strict resource lifecycle management: database transactions must always be explicitly committed or rolled back, file handles must be closed after writes complete, and HTTP connections must be returned to their pools on both success and error paths, with no pooled resource referenced beyond its valid scope.
- The connection pool must maintain healthy utilization: under sustained load, all database connections must return to an idle state within 5 seconds of query completion, and the pool must never become permanently saturated due to leaked or “idle in transaction” connections.
- The system must handle error and cancellation paths correctly: transient database failures, network timeouts, malformed external responses, or parent-task cancellation must trigger the same resource cleanup behavior as successful execution, without relying on implicit garbage collection or RAII-style destruction.
- Async task spawning must not create dangling or orphaned work: spawned child tasks must not prevent parent tasks from completing, must be observable for completion or failure, and must release all held resources even if the parent task exits early.
- The system must preserve performance guarantees while fixing leaks: p99 event processing latency must remain below 100ms, and throughput must sustain 200 events/second over long-duration tests without degradation due to serialized cleanup or blocking I/O
- The solution must comply with forbidden constraints: it must not rely on periodic restarts, unbounded buffers, manual memory management, blocking synchronous I/O, or increased resource limits, and it must remain correct under concurrent failures and task panics.

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
