import threading
import time
from collections import deque


class StrictFairSemaphore:
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be positive")

        self._capacity = capacity
        self._in_use = 0

        # Requirement 3: Use threading.Lock and threading.Condition manually
        # This lock protects core semaphore state: capacity, in_use, and waiters queue.
        self._lock = threading.Lock()
        
        # Requirement 1: Internal FIFO queue to track waiting threads
        # We store (waiter_obj, Condition) pairs.
        self._waiters = deque()

        # Requirement 6: Circular buffer for rolling wait-time metrics (O(1) updates)
        # Use a dedicated lock so metrics reads/writes are thread-safe without
        # risking re-entrancy issues on the main semaphore lock.
        self._metrics_lock = threading.Lock()
        self._wait_times = [0.0] * 100
        self._wt_sum = 0.0
        self._wt_count = 0
        self._wt_index = 0

    # ---------------- Metrics ----------------

    def _record_wait(self, duration: float):
        # Requirement 6: O(1) rolling average update
        # Protected by _metrics_lock to make the circular buffer thread-safe.
        with self._metrics_lock:
            old = self._wait_times[self._wt_index]
            self._wait_times[self._wt_index] = duration
            self._wt_sum += (duration - old)
            self._wt_index = (self._wt_index + 1) % 100
            self._wt_count = min(self._wt_count + 1, 100)

    def get_average_wait_time(self) -> float:
        # Requirement 6: Thread-safe metrics access
        # Use the same metrics lock used for updates so readers and writers
        # are fully synchronized.
        with self._metrics_lock:
            if self._wt_count == 0:
                return 0.0
            return self._wt_sum / self._wt_count

    # ---------------- Semaphore ----------------

    def acquire(self, timeout: float | None = None) -> bool:
        start_time = time.monotonic()
        deadline = None if timeout is None else start_time + timeout

        with self._lock:
            # Check availability: must have capacity AND no one waiting ahead
            if not self._waiters and self._in_use < self._capacity:
                self._in_use += 1
                self._record_wait(0.0)
                return True

            if timeout is not None and timeout <= 0:
                return False

            # Requirement 1: strictly FIFO. Create a condition for this thread.
            cond = threading.Condition(self._lock)
            waiter_entry = (object(), cond)
            self._waiters.append(waiter_entry)

            try:
                # Requirement 7: Use wait() logic
                while True:
                    # Check if it's our turn and capacity is available
                    if self._waiters[0] is waiter_entry and self._in_use < self._capacity:
                        self._waiters.popleft()
                        self._in_use += 1
                        self._record_wait(time.monotonic() - start_time)
                        
                        # Once we proceed, we should notify the NEXT waiter in case
                        # there's more capacity (e.g. after a resize up)
                        self._notify_next_waiter()
                        return True

                    remaining = None
                    if deadline is not None:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0:
                            return False # Timed out

                    # Wait on our specific condition
                    # Requirement 5: Manual lock/condition wait
                    if not cond.wait(timeout=remaining):
                        return False # Timed out

            finally:
                # Requirement 2: Cleanup - remove ourselves from the queue
                if waiter_entry in self._waiters:
                    is_head = self._waiters[0] is waiter_entry
                    self._waiters.remove(waiter_entry)
                    # If we were the head and we timed out, the next guy might be able to go
                    if is_head:
                        self._notify_next_waiter()

    def release(self):
        with self._lock:
            if self._in_use == 0:
                raise RuntimeError("release called too many times")

            self._in_use -= 1
            # Waking the next waiter in FIFO order
            self._notify_next_waiter()

    def _notify_next_waiter(self):
        # Internal helper to wake up the head of the line if capacity allows
        # This solves the "Thundering Herd" by only waking the one who can actually proceed.
        if self._waiters and self._in_use < self._capacity:
            # We don't pop yet, we just notify. The waiter will pop in its loop.
            _, cond = self._waiters[0]
            cond.notify()

    # ---------------- Dynamic Resize ----------------

    def resize(self, new_capacity: int):
        if new_capacity <= 0:
            raise ValueError("new_capacity must be positive")

        with self._lock:
            # Requirement 4: Handles natural reduction
            self._capacity = new_capacity
            # Capacity might have increased, wake as many as possible
            self._notify_next_waiter()
