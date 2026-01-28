# GMNMSY - State Machine Implementation Violates Deduplication Ordering, Output Contract, and Test Correctness

**Category:** sft

## Overview
- Task ID: GMNMSY
- Title: State Machine Implementation Violates Deduplication Ordering, Output Contract, and Test Correctness
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gmnmsy-state-machine-implementation-violates-deduplication-ordering-output-contract-and-test-correctness

## Requirements
- Deterministic Ordering Must Drive All Decisions  Events must be applied strictly in ascending occurredAtMs.  Ties must be broken using store-level arrival order.  All state transitions, deduplication decisions, and rejection logic must be based on this deterministic ordering—not on raw arrival time.  What’s missing: The implementation deduplicates events before ordering is resolved, causing incorrect winners when a later arrival has an earlier timestamp.
- Deduplication Must Respect Ordering Semantics  Deduplication must be scoped to (provider, eventId).  The first event by deterministic ordering must be applied.  Later duplicates must be ignored without affecting state or history.  What’s missing: Deduplication occurs immediately on arrival, allowing arrival order to override timestamp order, which violates the problem’s core rules.
- Terminal State Enforcement Must Be Immediate  Once a user reaches a terminal state, all subsequent events must be rejected immediately.  Rejected events must not be buffered or deferred.  The rejection reason must be deterministic and observable at the time of applyEvent.  What’s missing: Events are buffered and processed asynchronously even after a terminal state is reached, temporarily accepting invalid transitions.
- Idempotency Must Be Fully Deterministic  Reapplying the same event must always produce the same observable result.  The returned result must not depend on timing, buffering, or internal scheduling.  Idempotency must hold regardless of concurrency or arrival order.  What’s missing: The same event can return different ApplyResult values depending on whether it is buffered, duplicated, or processed later.

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
