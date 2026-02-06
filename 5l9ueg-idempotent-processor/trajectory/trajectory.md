# Trajectory (Thinking Process for Code Generation)

### 1. Audit the Problem Space (Identify Concurrency & State Risks)

I audited the requirements for distributed request processing. Naive implementations often suffer from race conditions where two concurrent requests trigger the same side effect twice. Additionally, simply caching results leads to unbounded memory growth (OOM errors) in long-running services.

Learn about Idempotency in distributed systems and why it is critical:

**What is Idempotency?**  
_In the context of REST APIs, when making multiple identical requests has the same effect as making a single request._  
Link: [https://restfulapi.net/idempotent-rest-apis/](https://restfulapi.net/idempotent-rest-apis/)

### 2. Define the Correctness Contract

I defined the strict execution contract:

- **Atomicity:** For any Key `K`, Action `V` runs exactly 0 or 1 times.
- **Consistency:** All threads awaiting Key `K` receive the same Result `V` (or the same Exception).
- **Isolation:** Processing Key A must not block Key B (No global locks).
- **Durability (In-Memory):** Results persist until eviction criteria are met.

### 3. Select Data Structures for Lock-Free Concurrency

I chose `ConcurrentHashMap<K, CompletableFuture<V>>` as the core storage.

- **Why `ConcurrentHashMap`?** Provides thread-safe, segment-locked access without blocking the entire map.
- **Why `CompletableFuture`?** It acts as a lightweight latch. It distinguishes between "processing in progress" (Pending) and "processing complete" (Done), preventing the "thundering herd" problem where multiple threads try to calculate the value simultaneously.

Learn about CompletableFuture for asynchronous programming:  
Link: [https://www.baeldung.com/java-completablefuture](https://www.baeldung.com/java-completablefuture)

### 4. Implement Atomic "Check-then-Act" with `putIfAbsent`

I utilized the atomic `map.putIfAbsent(key, future)` method.

- **Logic:** If the map returns `null`, the current thread is the "winner" and must execute the logic. If it returns an existing Future, the current thread is a "follower" and must simply wait.
- **Benefit:** guarantees that only one thread ever executes the `Supplier<V>`, satisfying the "at most once" requirement without `synchronized` blocks.

### 5. Enforce Bounded Memory (FIFO Eviction)

To satisfy the constraint of "bounded memory" without external storage, I implemented a custom eviction policy using a `ConcurrentLinkedQueue` and an `AtomicInteger`.

- **Why not `LinkedHashMap`?** `LinkedHashMap` requires locking to maintain access order, violating the "No global locks" constraint.
- **Solution:** A secondary queue tracks insertion order. When `size > capacity`, we poll from the queue and remove from the map.

### 6. Memoize Failures (Exception Caching)

I ensured that failures are treated as final results. If the `Supplier` throws an exception, the `CompletableFuture` is completed exceptionally.

- **Outcome:** Subsequent retries do not re-execute the failed logic; they receive the _same_ wrapped exception immediately, preserving system state consistency.

### 7. Unwrap Async Exceptions

Java's `CompletableFuture` wraps exceptions in `CompletionException`. To ensure the caller observes the "real" error (correctness criteria), I added logic to unwrap these exceptions before returning to the client.

### 8. Handling Edge Cases & Thread Safety

I verified thread safety against race conditions:

- **Race Condition:** Eviction vs. Insertion.
- **Fix:** The eviction logic uses atomic checks. Even if the size is slightly inconsistent for a nanosecond, the map and queue remain eventually consistent without locking.

### 9. Verification Strategy

I built a JUnit 5 test suite to simulate high-concurrency scenarios:

- **Latch Tests:** Using `CountDownLatch` to fire 50+ threads instantly at the same key.
- **Capacity Tests:** Flooding the processor to ensure old keys are dropped.
- **Failure Tests:** Ensuring exceptions are cached and rethrown correctly.

### 10. Result: A Lock-Free, Idempotent Application State

The solution provides O(1) access time, guarantees strictly one execution per key, maintains a fixed memory footprint, and handles failures gracefully using only the Java Standard Library.

---

## Trajectory Transferability Notes

The above trajectory is designed for **Code Generation**. The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as refactoring, performance optimization, testing, and full-stack development) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories by adapting the inputs, constraints, and validation signals specific to each task type.

### Code Generation → Refactoring

- **Audit** becomes identifying code smells and coupling.
- **Contract Definition** becomes preserving existing behavior while improving structure.
- **Structure Selection** becomes choosing design patterns (Strategy, Factory) over raw logic.
- **Atomic Implementation** becomes incremental extraction of methods/classes.
- **Verification** becomes regression testing.

### Code Generation → Performance Optimization

- **Audit** becomes profiling (CPU/Memory analysis).
- **Contract Definition** becomes setting latency/throughput targets (SLAs).
- **Structure Selection** becomes choosing primitive collections, caching, or non-blocking I/O.
- **Atomic Implementation** becomes removing bottlenecks and reducing lock contention.
- **Verification** becomes benchmarking (JMH).

### Code Generation → Testing

- **Audit** becomes analyzing requirements and edge cases.
- **Contract Definition** becomes defining "Given-When-Then" scenarios.
- **Structure Selection** becomes choosing the right test double (Mock vs Stub).
- **Atomic Implementation** becomes writing deterministic, isolated test cases.
- **Verification** becomes asserting coverage and mutation testing.

### Core Principle (Applies to All)

- **The trajectory structure stays the same**
- **Only the focus and artifacts change**
- **Audit → Contract → Design → Execute → Verify remains constant**
