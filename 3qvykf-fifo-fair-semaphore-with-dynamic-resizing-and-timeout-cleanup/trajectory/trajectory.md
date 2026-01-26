# Trajectory: Actions Taken to Implement fair_semaphore

This document outlines the specific actions taken to implement the strictly fair FIFO semaphore with dynamic resizing and rolling metrics.

## Action 1: Eliminate Deadlocks with Per-Waiter Condition Model
**Issue**: The initial implementation used a single `Condition` and `notify()`, which caused "Unfair Wakeup" deadlocks where the wrong thread was notified while the FIFO head remained asleep.

*   **Action Taken**: Refactored the semaphore to use a per-waiter `Condition` pattern.
    *   Updated the `_waiters` queue to store `(waiter_id, threading.Condition)` pairs.
    *   In `release()`, used `_notify_next_waiter()` to explicitly wake ONLY the thread at the head of the FIFO queue.
    *   Ensured that even if capacity is available, new acquisitions must join the queue if it's not empty, preventing "barging" and ensuring strict arrival order.

## Action 2: Robust Timeout Cleanup and "Ghost" Prevention
**Issue**: Threads that timed out inside `acquire()` were leaving entries in the queue, causing subsequent releases to waste notifications on dead threads.

*   **Action Taken**: Implemented guaranteed cleanup via `try...finally`.
    *   Wrapped the `while True` acquisition loop in a `try` block.
    *   In the `finally` block, added logic to remove the specific `waiter_entry` if it was still in the queue.
    *   Added a secondary notification logic: if a thread at the head of the queue times out, it notifies the NEXT waiter to prevent the system from stalling.

## Action 3: Implement O(1) Rolling Wait-Time Metrics
**Issue**: Requirement for constant-time metrics updates without list resizing or performance degradation.

*   **Action Taken**: Developed a thread-safe circular buffer for wait-time history.
    *   Initialized `_wait_times` as a fixed-size list of 100 floats.
    *   Maintained `_wt_sum` and `_wt_index` to allow average calculation as a simple division: `_wt_sum / _wt_count`.
    *   Wrapped metrics recording and retrieval in the main semaphore lock to ensure consistency during high-concurrency operations.

## Action 4: Handle Dynamic Capacity Throttling
**Issue**: Reducing semaphore capacity below current usage could lead to invalid resource states or over-acquisition.

*   **Action Taken**: Integrated capacity checks into the primary acquisition loop.
    *   Modified `resize()` to update the `_capacity` value and immediately notify the queue head.
    *   Ensured that if `current_usage > new_capacity`, the head waiter remains blocked in its `wait()` loop until `release()` brings usage below the new threshold naturally.

## Verification Action: Specialized Concurrency Debugging
**Action Taken**: Fixed and extended the automated test suite.
*   **Resolved Test Bugs**: Found and fixed instances in `tests/test_fair_semaphore.py` where threads were being started twice (RuntimeError) or releases were being sent incorrectly.
*   **Simulated Contention**: Created scenarios to verify that the "Thundering Herd" is eliminated (checked by tracking hit counts after a single release).
*   **Arrival Validation**: Verified strict FIFO order by comparing arrival timestamps with acquisition order.
