# GBVMMK - Go HTTP Connection Pool - Goroutine Leak Fix

**Category:** sft

## Overview
- Task ID: GBVMMK
- Title: Go HTTP Connection Pool - Goroutine Leak Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gbvmmk-go-http-connection-pool-goroutine-leak-fix

## Requirements
- The connection pool must enforce a maximum of 100 connections per host. The current implementation checks the limit but uses a stub function that always returns zero, allowing unlimited connections to be created. When the limit is reached, new requests should either wait with context awareness or return an error rather than creating additional connections
- All background goroutines must terminate when the pool is closed. The current health checker, idle evictor, and DNS refresher goroutines lack proper shutdown signaling via stop channels and WaitGroups. After calling Close(), the goroutine count should return to the pre-pool-creation level within one second.
- Unhealthy connections must be removed from the pool within one health check interval (10 seconds). The current implementation marks connections as unhealthy but does not remove them from the available pool, causing subsequent requests to receive dead connections. Health checks should use the connection's own HTTP client rather than a shared client.
- Idle connections must be closed after exceeding the configured idle timeout (60 seconds). The current idle evictor goroutine is started but the cleanup logic has race conditions or never executes. The evictor sh
- DNS resolution must be refreshed every 30 seconds for active hosts. The current implementation either caches DNS indefinitely or has bugs in the refresh logic that leak contexts. When DNS changes, existing idle connections to the old IP should be marked unhealthy and replaced on next use.
- Request context cancellation must terminate in-flight HTTP requests within 100 milliseconds. The current implementation does not propagate the parent context to the underlying HTTP client, causing requests to continue even after the caller's context is cancelled. Cancelled requests should mark their connection as unhealthy
- Connection statistics must accurately reflect the actual pool state. The current atomic counter updates have race conditions where the same connection is counted as both idle and active, or counters go negative after removal. Total connections should equal active plus idle at all times.
- Each host's connections must be tracked independently to prevent one slow backend from exhausting the entire pool. The current implementation uses a single shared data structure without proper per-host isolation, allowing a single unresponsive host to consume all available connections.
- The pool must handle graceful shutdown by closing all connections and waiting for background workers to complete. The current Close() method has no synchronization, potentially leaving connections open or causing panics from writes to closed channels. Shutdown should be idempotent using sync.Once.
- Health check goroutines must be bounded to prevent resource exhaustion during checks. The current implementation spawns an unbounded number of goroutines when checking many connections simultaneously. A worker pool or semaphore should limit concurrent health checks to a reasonable number such as 10.

## Metadata
- Programming Languages: Go
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
