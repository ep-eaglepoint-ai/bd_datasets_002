Trajectory (Thinking Process for Bounded Cache Task)
Analyze the requirements
1.1 Identified need for bounded capacity with deterministic eviction.
1.2 Confirmed preference for recently used entries implies LRU policy.
1.3 Noted expired entries must never be returned and no background cleanup allowed.
1.4 Recognized constraints: Java standard library only, constant-time access, no global locking, thread-safe.

Define the functional contract
2.1 Cache supports get/put with TTL per entry.
2.2 get returns empty when entry missing or expired.
2.3 put inserts or updates entry and refreshes recency.
2.4 Capacity must never exceed max; eviction is deterministic LRU.
2.5 Expired entries are removed on access and insertion paths.

Design the data structures
3.1 Use ConcurrentHashMap for O(1) lookup.
3.2 Use ConcurrentLinkedDeque for recency order.
3.3 Store node references for O(1) removal from deque.
3.4 Each entry stores value, expiry timestamp, and node pointer.

Ensure deterministic eviction
4.1 Evict from tail of deque as least recently used.
4.2 On access, move node to head.
4.3 On insert, add to head and evict until size <= capacity.
4.4 Remove expired entries during get/put and while evicting.

Ensure thread safety without global locking
5.1 Use per-entry synchronization with AtomicReference for node updates.
5.2 Use compare-and-swap loops for map operations.
5.3 Use deque operations that are thread-safe and non-blocking.
5.4 Maintain size via AtomicInteger with bounded adjustments.

Implement constant-time operations
6.1 get: map lookup, expiry check, node move to head.
6.2 put: map insert/replace, node move to head, evict loop.
6.3 remove: map remove, node unlink, size decrement.

Validate constraints
7.1 No background threads used.
7.2 Only Java standard library types used.
7.3 Deterministic eviction by strict LRU order.
7.4 Capacity enforced on every put.
7.5 Expired entries never returned.

Finalize
8.1 Provide single Java class with public API.
8.2 Ensure thread-safe behavior under concurrent access.
8.3 Ensure no global locks and constant-time access paths.