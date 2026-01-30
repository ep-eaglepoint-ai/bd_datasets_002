# VYQ9E9 - In-Memory Graph Transaction Engine with Deterministic Locking 

**Category:** sft

## Overview
- Task ID: VYQ9E9
- Title: In-Memory Graph Transaction Engine with Deterministic Locking 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vyq9e9-in-memory-graph-transaction-engine-with-deterministic-locking

## Requirements
- File must be named transaction_manager.go.
- Must use sync.RWMutex per Node (Fine-grained locking).
- Must NOT use a single global mutex for the entire commit process (Performance Failure).
- The Commit/Execute logic must explicitly sort the list of Node IDs before attempting to acquire locks.
- The Write method must update a local map/buffer, NOT the global node state directly.
- The global state must only be updated after all locks are successfully acquired.
- Must check invariant constraints (e.g., Balance >= 0) before applying writes.
- If validation fails, the system must release locks and return an error without modifying global state.
- Lock releases must be handled via defer to guarantee cleanup during panics.
- The system must pass a stress test of 100+ concurrent transactions swapping assets without hanging.
- Node IDs should be handled consistently (e.g., string or int64) to support sorting.
- Must expose Begin, Read, Write, and Commit methods.

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: Standard Library (sync, sort).
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
