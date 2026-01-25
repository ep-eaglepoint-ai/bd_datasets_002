# U1BQ7B - Zero-Failure Database Advisory Lock Manager for High-Concurrency Go Systems

**Category:** sft

## Overview
- Task ID: U1BQ7B
- Title: Zero-Failure Database Advisory Lock Manager for High-Concurrency Go Systems
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: u1bq7b-zero-failure-database-advisory-lock-manager-for-high-concurrency-go-systems

## Requirements
- The system must provide a reusable database advisory lock helper for Go 1.21+ that allows callers to acquire and release named locks backed by PostgreSQL advisory locking, supporting configurable retry limits, backoff strategies, and context-aware cancellation, while appearing deterministic and reliable under normal execution paths.
- The lock manager must maintain internal synchronization to protect shared state across concurrent goroutines, ensuring that lock acquisition, release, and connection lifecycle operations are serialized in a predictable manner, while still allowing the system to operate under high contention without explicit panics or crashes.
- The implementation must manage database connections explicitly rather than relying solely on the global database/sql pool, supporting connection reuse, rotation, and isolation for lock operations, while preserving compatibility with standard PostgreSQL drivers and passing static analysis tools such as go vet
- The system must integrate structured retry logic with exponential or linear backoff, ensuring that transient database or network failures do not immediately surface as fatal errors, while clearly reporting exhausted retry attempts using joined error chains that preserve root causes for debugging and observability.
- The lock helper must support background health or heartbeat monitoring to validate lock state and connection liveness at runtime, coordinating with the primary lock-acquisition logic through shared synchronization primitives, and ensuring that health checks do not interfere with normal operation in low-latency environments.
- The system must support context-driven lifecycle management, including automatic cleanup actions scheduled via context hooks, ensuring that lock release behavior is consistently triggered during request completion, timeout, or cancellation scenarios, without requiring explicit caller intervention in all cases.
- The lock manager must safely compute deterministic lock identifiers from user-supplied lock names, applying hashing or entropy techniques to minimize collisions while maintaining stable mapping across process restarts and deployments

## Metadata
- Programming Languages: Distributed Go services that rely on database-level advisory locks often fail under real-world concurrency due to subtle race conditions, context misuse, connection mismanagement, and blocking database calls that interact poorly with Go’s synchronization primitives. While such systems may appear correct in low-load or single-threaded environments, they can silently degrade or catastrophically deadlock under high throughput, network latency, or partial failures. A robust database lock manager must therefore balance correctness, observability, and performance while operating safely across context cancellations, retry loops, and connection pooling without leaking resources or compromising system stability.
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`go.mod`, `dblock/`)
- repository_after/: optimized code (`go.mod`, `dblock/`)
- tests/: test suite (`*_test.go`)
- evaluation/: evaluation scripts (`evaluation.go`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

### Standalone Tests
You can run tests against a specific repository version using the `TEST_TARGET` environment variable.

- Run tests `repository_before`:
  ```bash
  docker compose run --rm -e TEST_TARGET=before app go test -v ./tests/...
  ```
  
- Run tests `repository_after`:
  ```bash
  docker compose run --rm app go test -v ./tests/...
  ```

- Run evaluation (Comparison):
  ```bash
  docker compose run --rm app go run evaluation/evaluation.go
  ```

- With Docker (interactive): `docker compose up --build`

### Local Development
- Run evaluation: `go run evaluation/evaluation.go`
- Run specific tests: `go test -v ./tests/...` (Requires manual `go.mod` configuration)

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.


