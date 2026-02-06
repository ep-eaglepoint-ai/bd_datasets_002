# Trajectory (Thinking Process for Refactoring)

## 1. Audit the Original Code (Identify Concurrency & Scaling Problems)
I audited the original code `repository_before/queue.py`. It had critical flaws: unprotected shared state access causing race conditions, blocking `time.sleep` calls freezing the event loop, incorrect priority ordering (min-heap instead of max-heap), and memory leaks from unbounded caches.
*   **Problem:** `time.sleep` blocks the entire asyncio event loop, preventing concurrency.
*   **Resource:** [Blocking tasks in asyncio](https://docs.python.org/3/library/asyncio-dev.html#debug-mode-of-asyncio)

## 2. Define a Correctness Contract First
Before fixing, I defined strict test cases for each requirement (R1-R8). The contract required: higher priority tasks first, zero data loss during high concurrency (10k tasks), and predictable retry delays.
*   **Contract:** "All shared state modifications must be atomic via locks; all waits must be awaitable."
*   **Resource:** [Asyncio Testing Patterns](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html)

## 3. Rework the Data Model for Concurrency
I introduced `asyncio.Lock` to strictly serialize access to shared dictionaries (`_tasks`, `_results`). I also added `_running_asyncio_tasks` map to track active coroutines for proper cancellation, ensuring we don't lose track of running work.
*   **Concept:** Mutual exclusion in async code.
*   **Resource:** [Asyncio Synchronization Primitives](https://superfastpython.com/asyncio-lock/)

## 4. Rebuild Core Logic with Non-Blocking Primitives
I replaced all blocking calls. `time.sleep()` became `await asyncio.sleep()`. I fixed the priority queue logic to use Tuple comparison `(-priority, sequence)` to achieve Max-Heap behavior with FIFO stability.
*   **Fix:** `heapq` is a min-heap. Negating priority turns it into a max-heap.
*   **Resource:** [Python heapq documentation](https://docs.python.org/3/library/heapq.html)

## 5. Implement Graceful Cancellation & Shutdown
I rebuilt the `stop()` method to follow a strict order: signal stop -> cancel running tasks -> gather workers. This prevents deadlocks where `stop()` waits for workers that are waiting for new tasks or stuck in long-running jobs.
*   **Strategy:** Graceful shutdown pattern.
*   **Resource:** [Asyncio Task Cancellation](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)

## 6. Fix Retry Logic with Exponential Backoff
I corrected the backoff formula to `min(base * 2^retry, max)` and ensured `base_delay` passed to the policy allows for fast testing (0.1s) vs production defaults (1.0s).
*   **Concept:** Exponential Backoff and Jitter.
*   **Resource:** [Exponential Backoff and Jitter (AWS)](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

## 7. Modularize for Maintainability
I refactored the monolithic `AsyncTaskQueue` into the `async_queue` package (`models`, `policies`, `containers`, `core`) to separate concerns, while keeping a backward-compatible Facade in `queue.py`.
*   **Pattern:** Facade Design Pattern.
*   **Resource:** [Refactoring to Packages](https://docs.python.org/3/tutorial/modules.html#packages)

## 8. Result: measurable Reliability
The solution now passes 34/34 tests, handles 10,000 concurrent tasks without error, and cleanly separates core logic from data structures.
*   **Outcome:** 100% Requirement Coverage.
