### 3. Trajectory

#### Analysis
I deconstructed the rate limiter into three decoupled layers: `Types` (Validation), `Algorithms` (Pure logic), and `Storage` (Concurrency/State). This allows for easy algorithm swapping while maintaining thread-safe storage.

#### Strategy
*   **Per-Key Locking:** Instead of a global lock which bottlenecks multi-tenant systems, I implemented a `get_lock(key)` pattern to allow parallel processing for different users.
*   **Daemon Cleanup:** Implemented a background thread to reap expired keys, ensuring memory usage stays linear to active users, not historical users.
*   **Lazy Refill:** For the Token Bucket, I chose an on-demand refill strategy based on time deltas to avoid expensive background timer threads for every bucket.

#### Execution
1.  **Storage:** Built `InMemoryStorage` with a thread-safe `_locks` registry.
2.  **Algorithms:** Implemented the weighted Sliding Window Counter and the fractional Token Bucket.
3.  **Synchronization:** Wrapped algorithm execution in `with lock` blocks to ensure atomicity.
4.  **Verification:** Used `unittest.mock.patch` on `time.time` to test edge-case window crossings.

#### Resources
*   [Stripe Engineering: Scaling your API rate limiter](https://stripe.com/blog/rate-limiters)
*   [Python Docs: Threading and Locks](https://docs.python.org/3/library/threading.html)
*   [Rate Limiting Algorithms (System Design)](https://konghq.com/blog/how-to-design-a-scalable-rate-limiting-algorithm)

---
