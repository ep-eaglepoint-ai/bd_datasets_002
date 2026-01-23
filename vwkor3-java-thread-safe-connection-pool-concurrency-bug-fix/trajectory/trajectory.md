# Trajectory (Thinking Process for ConnectionPool Refactoring)

### 1. Audit the Original Code (Identify Concurrency Bottlenecks)
I audited the original code. It used coarse-grained synchronization (`synchronized(this)`) on the `borrow` method. This forced all threads to serialize, meaning if one thread took 500ms to validate a connection (I/O), all 499 other threads were blocked from even checking the pool status. This caused the throughput collapse.

*Learn about the impact of synchronized blocks on throughput:*
> **Java Concurrency: The Hidden Cost of Synchronization**
> (Conceptually similar to N+1, but for thread contention)

### 2. Define a Performance Contract First
I defined the concurrency constraints:
*   **Metric:** `maxSize` is a hard limit; it must account for objects currently being created (pending), not just those in lists.
*   **Concurrency:** Validation and Factory creation (slow I/O) must happen *outside* the lock.
*   **Latency:** Timeouts must use monotonic time (`nanoTime`) to prevent clock skew errors.
*   **Safety:** Interrupts must be propagated, not swallowed.

### 3. Rework the Data Model for Efficiency (Lock Stripping)
I replaced the method-level `synchronized` keyword with a `ReentrantLock` and a `Condition`. This allows for fine-grained control: we can lock to update state, unlock to do I/O, and re-lock to commit changes.

*See more on ReentrantLocks:* **Java Concurrency: ReentrantLock vs Synchronized**

### 4. Rebuild Borrow as a Projection-First Pipeline (Capacity Reservation)
Instead of checking `inUse.size() + available.size()`, I introduced a separate atomic integer or locked integer `totalCount`. This acts as a "reservation" system. A thread reserves a slot *before* creating an object. This prevents race conditions where multiple threads see `size=49` and all try to create the 50th object simultaneously.

### 5. Move Slow Operations "Server-Side" (Outside the Lock)
I moved the `factory.get()` and `validator.test()` calls outside the critical section.
*   **Old Flow:** Lock -> Check -> Create/Validate (Hold Lock) -> Return -> Unlock.
*   **New Flow:** Lock -> Reserve Capacity -> Unlock -> Create/Validate (No Lock) -> Lock -> Commit -> Unlock.

This ensures 500 threads can validate concurrently.

### 6. Use Condition.await Instead of Object.wait
I replaced `wait(timeout)` with `condition.awaitNanos(nanos)`. This provides higher precision for timeouts and integrates cleanly with `ReentrantLock`. It allows specific signaling (`signalAll`) when capacity becomes available, rather than a generic notify.

### 7. Stable Ordering + Timeout Loops (Spurious Wakeups)
I implemented a `while` loop for waiting. Threads often wake up without a signal (spurious wakeups). The loop re-checks conditions (`available.isEmpty() && totalCount >= maxSize`) and recalculates the remaining timeout using `System.nanoTime()`. If the deadline passes, it throws the exception immediately.

### 8. Eliminate "Object Already In Use" Race Conditions
I ensured that state transitions are atomic within the lock. An object is never put into the `available` queue without being removed from `inUse` and vice versa. The specific error "Object already in use" came from recycled objects not being tracked correctly during concurrent release/borrow cycles; strict Set management resolved this.

### 9. Normalize Exception Handling (Leak Prevention)
I added `try-catch` blocks around the "Outside Lock" operations. If `factory.get()` throws an exception or `validator.test()` fails:
1.  We must re-acquire the lock.
2.  Decrement `totalCount` (release the reservation).
3.  Signal waiting threads.

Without this, a failed factory call would permanently "leak" a slot in the pool, eventually causing the pool to appear full when it was empty.

### 10. Result: Measurable Performance Gains + Predictable Signals
The solution now handles 500+ thread