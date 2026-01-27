# OAS37A - asynchronus task queue

**Category:** sft

## Overview
- Task ID: OAS37A
- Title: asynchronus task queue
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: oas37a-asynchronus-task-queue

## Requirements
- The code contains multiple locations where shared mutable state (task counts, result cache, worker status) is accessed without proper locking, causing data races when multiple workers or the main thread access simultaneously. Identify all shared state variables, determine which require synchronization, and add appropriate asyncio.Lock or threading.Lock protection. Pay special attention to read-modify-write patterns where a value is read, modified, and written back—these must be atomic. The statistics counters must accurately reflect actual completed, failed, and pending task counts after concurrent execution.
- The code contains several off-by-one errors in loop conditions, array indexing, and range calculations that cause tasks to be skipped, processed twice, or cause index out of bounds errors. Carefully review all for loops, while conditions, and slice operations. Check that retry counts are incremented and checked correctly (should retry max_retries times, not max_retries-1 or max_retries+1). Verify that worker IDs, task IDs, and array indices are consistent throughout.
- The current implementation has bugs in the comparison logic that cause tasks to be processed in incorrect order. Higher priority tasks (higher number) must be processed before lower priority tasks, and within the same priority level, tasks must be processed in FIFO order (earlier submission first). The bug may be in the comparison operator, the heap operations, or the tuple ordering. After fixing, a test submitting tasks with priorities [1, 5, 3, 5, 2] should process them in order [5, 5, 3, 2, 1] with FIFO ordering within priority 5.
- The code contains instances where blocking operations are called without await, async functions are called without await (returning coroutine objects instead of results), or sync blocking calls (like time.sleep) are used instead of async equivalents (asyncio.sleep). These cause the event loop to block, preventing concurrent task execution. Also check for cases where await is incorrectly used on non-awaitable objects. The worker pool must achieve true concurrent execution where multiple workers process tasks simultaneously.
- The cancel_task and shutdown methods have bugs that leave tasks in inconsistent states, fail to actually cancel running coroutines, or don't properly update statistics. Cancelled tasks must be removed from pending queues, running tasks must have their asyncio.Task cancelled, and the task status must be updated to CANCELLED. Ensure CancelledError is properly caught and handled in workers without crashing the worker loop. After cancellation, workers must continue processing remaining tasks.
- The exponential backoff calculation has bugs in the formula, the retry count comparison uses wrong operators, or the delay is not actually applied before retrying. The correct formula is: delay = min(base_delay * (2 ** retry_count), max_delay). Verify that tasks are retried exactly max_retries times (not more, not fewer), that delays increase exponentially, and that the jitter calculation (if present) doesn't produce negative delays. Tasks exceeding max_retries must be marked as FAILED, not retried forever.
- The code has memory leaks from: asyncio.Task objects that are created but never awaited or cancelled, results stored in cache that are never cleaned up, references to completed tasks kept in data structures, and queues that grow unbounded. Implement proper cleanup: completed tasks should be removed from tracking structures, the result cache should have a maximum size with LRU eviction or TTL expiration, and shutdown must cancel and await all pending asyncio.Tasks. After processing 10,000 tasks, memory usage should return to near-baseline levels.
- The code fails on edge cases including: empty task queue (should not raise exception), zero workers configured (should raise clear error at init, not fail later), task submitted after shutdown (should raise exception, not silently fail), duplicate task IDs (should raise or handle gracefully), very high concurrency (100+ workers), rapid submit/cancel cycles, and exceptions in task handlers (should be caught and recorded, not crash worker). Each edge case must be handled with appropriate error messages or graceful degradation.

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
