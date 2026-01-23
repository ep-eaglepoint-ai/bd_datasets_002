# KV9U6E - Thread-Safe MVCC Key-Value Store with Snapshot Isolation

**Category:** sft

## Overview
- Task ID: KV9U6E
- Title: Thread-Safe MVCC Key-Value Store with Snapshot Isolation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kv9u6e-thread-safe-mvcc-key-value-store-with-snapshot-isolation

## Requirements
- The solution must use pure Python (standard library only) with no external dependencies (e.g., pandas, sqlite3, or redis are forbidden).
- The class TransactionalKVStore must implement begin_transaction, put, get, commit, and rollback with exact signatures.
- The get(tid, key) method must return the value committed before the transaction tid started. It must ignore changes committed by transactions with newer timestamps.
- The put method must verify version consistency. If the target key has been modified by a newer transaction since the current transaction started, it must immediately raise a WriteConflictError.
- Read operations must not acquire exclusive locks that block Write operations. The system must maintain a version history (linked list or list of tuples) for every key.
- The system must implement a vacuum() method that correctly identifies the "Global Watermark" (the oldest active transaction ID) and deletes only those version records that are no longer visible to any active transaction.
- All state-changing methods (put, commit, vacuum) must be thread-safe using threading.Lock or threading.RLock. The assignment of commit timestamps must be atomic to prevent race conditions.

## Metadata
- Programming Languages: Python 3.8+
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
