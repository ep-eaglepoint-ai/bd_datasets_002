# SR2OME - connection pool

**Category:** sft

## Overview
- Task ID: SR2OME
- Title: connection pool
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sr2ome-connection-pool

## Requirements
- The constructor must accept `min_connections` and `max_connections` parameters. Upon initialization, the pool must eagerly create `min_connections` connections and store them as available. The pool must never exceed `max_connections` total connections at any time, and attempting to acquire when at maximum capacity with no available connections must block until one becomes available or timeout occurs.
- The `acquire()` method must return an available connection or create a new one if below max capacity, blocking with an optional `timeout` parameter if none are available. The `release(connection)` method must return a connection to the available pool. Both methods must use proper locking (threading.Lock or threading.Condition) to prevent race conditions when multiple threads access the pool simultaneously.
- The `PooledConnection` wrapper or the pool itself must implement `__enter__` and `__exit__` to support the `with` statement pattern. When the context exits (normally or via exception), the connection must be automatically returned to the pool without requiring explicit release calls from the user.
- The pool must support an optional `validate` callable that checks if a connection is still valid before returning it from `acquire()`. Invalid connections must be discarded and replaced. The `PooledConnection` must track `last_used` timestamp and optionally implement a `max_idle_time` after which connections are considered stale.
- The `close()` method must close all connections (both available and in-use) and prevent further acquisitions by raising an exception. The `stats()` method must return a dictionary containing: total connections created, current pool size, available count, in-use count, and total acquisitions served.
- The constructor must accept a `connection_factory` callable that creates new connections when needed. This allows the pool to be generic and work with any connection type (database, HTTP, socket, etc.) without hardcoding the connection creation logic.

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
