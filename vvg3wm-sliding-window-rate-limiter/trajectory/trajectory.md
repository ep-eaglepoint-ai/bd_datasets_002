### 3. Trajectory (`trajectory/trajectory.md`)

#### Analysis
I deconstructed the Rate Limiter requirement into three main pillars: **Algorithmic Accuracy** (Sliding Window vs Fixed), **Resource Safety** (Memory Cleanup), and **Concurrency** (Thread-safe locks). The sliding window necessitates a queue-based approach to track specific timestamps rather than a simple counter.

#### Strategy
*   **Data Structure:** Used `collections.deque` because `popleft()` is $O(1)$, making it the most efficient structure for pruning expired timestamps from the head of the history.
*   **Synchronization:** Implemented a coarse-grained `threading.Lock` around the history dictionary to ensure atomic "Check-and-Increment" operations, preventing race conditions in high-concurrency environments.
*   **Determinism:** Used a `Callable` time source injection. This allows tests to manually advance a mock clock, eliminating "flaky" tests caused by `time.sleep()`.

#### Execution
1.  **Skeleton:** Defined the class with injectable `time_function`.
2.  **Logic:** Implemented `_get_clean_history` as a private helper used by all public methods to ensure state is always fresh before evaluation.
3.  **Cleanup:** Designed a global `cleanup()` method that iterates through the registry to prevent memory leaks from stale keys.
4.  **Verification:** Created a stress test with 100 threads to prove thread safety.

#### Resources
*   [Python Docs: Collections.deque](https://docs.python.org/3/library/collections.html#collections.deque)
*   [System Design: Rate Limiting Fundamentals](https://bytebytego.com/courses/system-design-interview/design-a-rate-limiter)
*   [Thread-safe Python Dictionaries](https://docs.python.org/3/library/threading.html)

---
