# VWKOR3 - Java Thread-Safe Connection Pool Concurrency Bug Fix

**Category:** sft

## Overview
- Task ID: VWKOR3
- Title: Java Thread-Safe Connection Pool Concurrency Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vwkor3-java-thread-safe-connection-pool-concurrency-bug-fix

## Requirements
- Pool size must never exceed the configured maxSize under any concurrency scenario. When 500 concurrent threads attempt to borrow objects from a pool with maxSize=50, monitoring must never observe more than 50 total objects (available + in-use combined) at any measurement point.
- Throughput must remain above 100 operations per second even when object validation takes 500ms. Under load of 500 concurrent threads with slow validation, the system should not drop to single-digit ops/sec due to serialization of unrelated operations.
- No thread should block other threads from performing independent work. If Thread A is validating Object 1, Thread B must be able to simultaneously validate Object 2 without waiting for Thread A to complete.
- Borrow timeout must be accurate within 100ms of the requested value. If a thread requests a 500ms timeout on an exhausted pool, the timeout exception must occur between 400ms and 600ms - not earlier or significantly later.
- Spurious wakeups must be handled correctly. If a waiting thread wakes without an object being available, it must recheck conditions and continue waiting (with recalculated remaining timeout) rather than proceeding incorrectly or timing out prematurely.
- All waiting threads must eventually wake when objects become available. When an object is released back to the pool, at least one waiting thread must be notified and given the opportunity to acquire it. No thread should hang indefinitely while objects are available.
- Thread interrupt status must be preserved through all code paths. If a thread is interrupted while waiting for an object, InterruptedException must be thrown and the thread's interrupt flag must remain set for caller handling.
- Invalid objects must be removed from the pool, not recycled. When the validator returns false for an object, that object must be discarded entirely and never returned to the available queue or lent to another thread.
- No "object already in use" errors under concurrent access. When multiple threads borrow and release objects concurrently, each object must be lent to exactly one thread at a time. The same object must never be given to two threads simultaneously.
- Double release must be handled safely. If a thread calls release() twice on the same object, the second call must be a no-op or throw an appropriate exception. The object must not be added to the available pool twice.
- Release of objects not from the pool must be handled safely. If release() is called with an object that was never borrowed from this pool, it must either be ignored or throw IllegalArgumentException. It must not corrupt pool state.
- Zero timeout must behave as "try once without waiting". If borrow(0, TimeUnit.MILLISECONDS) is called and no objects are available, RuntimeException must be thrown immediately without any blocking.
- New object creation must not exceed pool capacity. If 10 threads simultaneously try to create new objects when pool is at maxSize-1 capacity, only one thread should successfully create an object. Others must wait or timeout.
- Factory failures must not corrupt pool state. If the factory throws an exception while creating a new object, any reserved capacity must be released and waiting threads must be notified so they can retry or timeout normally.
- Validation failures must not leak capacity. If validation fails for an object, the pool's capacity tracking must be updated correctly so that new objects can be created to replace the invalid one.
- The solution must pass a stress test of 10,000 borrow/release cycles executed across 1000 concurrent threads with random delays between 1-50ms, with zero errors and pool size never exceeding maxSize.

## Metadata
- Programming Languages: Java
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
