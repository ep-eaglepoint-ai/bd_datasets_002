# Trajectory - Go High-Throughput Idempotent Dispatcher

This document outlines the engineering process used to design and implement the idempotent event dispatcher.

## Analysis
The core objective was to build a "Guaranteed Delivery" layer in Go that prevents duplicate executions while maintaining strict causal ordering for entities.

Key constraints identified:
- **State Management**: Events must transition through `PENDING`, `IN_FLIGHT`, `RETRY_WAIT`, and `FAILED`.
- **Idempotency**: Strict "exactly-once" logical guarantee using a persistent store.
- **Ordering**: No event $N$ can be sent until $N-1$ is finalized (Sequence Guard).
- **Resilience**: Exponential backoff (1s to 60s) + 10% jitter + Dead Letter Queue after 5 failures.
- **Throttling**: Maximum 50 concurrent connections per domain host.
- **Graceful Shutdown**: SIGTERM must allow active workers to complete.

## Strategy
I chose an architecture based on a **Concurrent Worker Pool** with several synchronization layers:
1. **State Machine**: Centralized logic for valid state transitions to prevent race conditions.
2. **Domain Sharding**: Used buffered channels as semaphores (size 50) per unique host to enforce rate limits without blocking other domains.
3. **Sequence Guard**: Implemented a per-entity locking mechanism (`entityLocks`) to ensure strictly serial processing for specific users/entities.
4. **Polling Pattern**: An `eventPoller` groups pending events by entity and finds the "next-in-line" sequence to feed into the worker channel.
5. **Atomic Metrics**: Used Go's `sync/atomic` for high-performance telemetry collection.

## Execution
1. **Domain Model**: Defined the `Event` struct and `EventState` constants in `event.go`.
2. **Interface Abstraction**: Created `PersistentStore` in `store.go` to decouple the orchestrator from specific database implementations.
3. **Retry Logic**: Built the `RetryPolicy` in `retry.go` using `math.Pow` for exponential backoff and `rand` for randomized jitter.
4. **Orchestrator Core**: 
   - Initialized the `worker` pool using `sync.WaitGroup`.
   - Implemented `processEvent` with a multi-gate check (Idempotency -> Sequence Guard -> Domain Rate Limit).
   - Integrated `http.Client` with `context` for the mandatory 5s timeouts.
5. **Persistence Fix**: Updated `evaluation.py` and `docker-commands.md` to ensure `report.json` artifacts are persisted during remote runs via S3 upload and volume mounts.
6. **Verification**: Developed `dispatcher_test.go` with mocks for high-latency servers and concurrent collision testing.

## Resources
- **Go Concurrency**: [Go Channels & Select](https://go.dev/tour/concurrency/2)
- **Retry Algorithms**: [Exponential Backoff And Jitter (AWS)](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- **Rate Limiting**: [Domain-based sharding patterns](https://en.wikipedia.org/wiki/Shard_(database_architecture))
- **Standard Library Docs**: `net/http`, `sync`, `context`
