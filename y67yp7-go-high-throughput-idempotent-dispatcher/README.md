# Y67YP7 - Go-High-Throughput-Idempotent-Dispatcher

**Category:** sft

## Overview
- Task ID: Y67YP7
- Title: Go-High-Throughput-Idempotent-Dispatcher
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: y67yp7-go-high-throughput-idempotent-dispatcher

## Requirements
- Implement an `EventOrchestrator` in Go that manages a pool of workers. The orchestrator must accept events with an `EventID`, `EntityID`, `SequenceNumber`, and `Payload`.
- Idempotency Guard: Before any dispatch, the worker must check the persistent store for the `EventID`. If an event is already 'COMPLETED' or 'IN_FLIGHT', the dispatcher must not initiate a new network request.
- Causal Ordering: For any given `EntityID`, the dispatcher must not attempt to send an event with `SequenceNumber: N` until the event with `SequenceNumber: N-1` has been successfully acknowledged or permanently failed.
- Retry Policy: Implement a retry loop with exponential backoff (starting at 1s, doubling up to 60s) and a 10% randomized jitter. After 5 failed attempts, move the event to a 'Dead Letter' state and block subsequent sequences for that Entity ID until manual intervention occurs.
- Concurrency & Sharding: Use Go channels and wait groups to manage a configurable number of concurrent workers. Implement a 'Domain Shard' that limits outgoing requests to a single destination host to 50 concurrent connections to avoid being flagged as a DDoS attack.
- Context & Timeouts: Every outgoing request must respect a global 5-second timeout. If the dispatcher itself is shut down (via SIGTERM), it must allow active workers to finish their current request before exiting.
- Testing: Create a test suite using Go's `testing` package. Requirement 1: Mock a high-latency server and verify that the 'Sequence Guard' prevents event 2 from being sent while event 1 is retrying. Requirement 2: Verify that 100 simultaneous calls for the same `EventID` result in exactly one successful POST. Requirement 3: Assert that the worker pool correctly shuts down when the context is cancelled without leaking goroutines

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
- With Docker Compose: `docker-compose up solution evaluation`
- With Docker directly: See `docker-commands.md` for commands
- Uses pre-built image `hailu3548/jr2pzv-app` from Docker Hub (no build needed)
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
