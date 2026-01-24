# LCXBI7 - Go-Linearizable-Sequence-Lease-Manager

**Category:** sft

## Overview
- Task ID: LCXBI7
- Title: Go-Linearizable-Sequence-Lease-Manager
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lcxbi7-go-linearizable-sequence-lease-manager

## Requirements
- The `AcquireAndHold` method must return a `FencingToken` (int64) derived from the storage layer's revision counter. This token must be strictly greater than any token previously issued for that resource.
- Implement a 'Watch-based Waiter': if the resource is currently locked, the `AcquireAndHold` call must block by watching the key for deletion events rather than using a sleep-loop. It must respect the caller's context timeout/deadline.
- Develop a background 'Heartbeat Monitor' that renews the lease at precisely 1/3 of the TTL duration. It must use `CompareAndSwap` to ensure it only renews the lock it currently holds; if the CAS fails (indicating the lock was hijacked or expired), it must immediately trigger a permanent cancellation of the worker's context.
- Implement 'Async Safety': the heartbeat routine must be resilient to transient network errors, using a capped exponential backoff, but it must 'fail-fast' and revoke the local lease if it cannot reach the store within the remaining 50% of the lease TTL.
- The system must handle 'Graceful Handover': include a `Release` method that atomically deletes the lock and shuts down the heartbeat monitor, ensuring no goroutines are leaked.
- Ensure the solution uses Go's monotonic clock (`time.Duration`) for all internal timing to prevent lease expiration errors caused by system clock adjustments (NTP slews).
- Testing: Provide a high-concurrency test where 50 goroutines compete for one lock. Assert that: 1) No two workers ever receive the same context/token simultaneously. 2) Fencing tokens are strictly increasing. 3) A simulated 'network partition' (mocked store failure) results in the worker's context being canceled before the TTL would have expired on a healthy node.

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
