# Trajectory

## 1. Project Requirements Analysis
The goal is to implement a robust **LRU Cache with TTL (Time-To-Live)**. The key requirements were:
- **LRU Eviction**: When capacity is reached, the Least Recently Used item must be removed.
- **TTL Expiration**: Items should become inaccessible after a specified duration.
- **Reliability**: The cache must handle edge cases like zero/negative capacity, rapid updates, and consistent state management.
- **Testing**: A comprehensive test suite achieving 100% coverage, including specific scenarios for stale reads, atomic updates, and high load.

## 2. Implementation Strategy (`lru_ttl_cache.py`)
Python's built-in `OrderedDict` is used to manage the LRU property efficiently.
- **Data Structures**:
    - `self.cache`: An `OrderedDict` storing `key -> value`. It handles insertion order and moving items to the end (MRU) in O(1).
    - `self.expiry_map`: A standard dictionary storing `key -> expiration_timestamp`. This allows O(1) expiration checks.
- **Core Logic**:
    - **`get(key)`**: Lazy expiration. If an item is accessed after its TTL, it is immediately deleted and `None` is returned. If valid, it is moved to the end of the `OrderedDict` (marked as MRU).
    - **`put(key, value)`**: Handles both updates and new insertions.
        - If the key exists, it is deleted first to reset its position and metadata.
        - If capacity is reached, the oldest item (first in `OrderedDict`) is popped.
        - The new item is added to the end (MRU) and its expiration time is set.
    - **`prune_expired()`**: A maintenance method to actively scan and remove all expired items, returning the count of removed entries.

## 3. Testing & Validation
Two test suites were established to verify the implementation:

### 3.1 Meta-Tests (`tests/test_cache_meta.py`)
These tests strictly validate the requirements outlined in the `README.md`:
- **Stale Read**: Confirms that mocking time past TTL results in a cache miss.
- **LRU Ordering**: precise verification of eviction order (e.g., Accessing A in `[A, B, C]` results in `[B, C, A]`, so inserting D evicts B).
- **Atomic Update**: Ensures updating an existing key refreshes both its value and TTL, and promotes it to MRU.
- **Prune Expired**: Validates the cleanup logic.
- **Edge Cases**: Handles zero capacity and negative TTL gracefully.
- **High Load**: Simulates 1500+ operations to guarantee capacity constraints are never violated.

### 3.2 Reliability Tests (`repository_after/test_cache.py`)
Additional test cases were added to cover specific behaviors and edge cases:
- **Capacity=1**: Verifies strict eviction in minimal capacity scenarios.
- **Expired Items & Capacity**: Confirms that expired items (when lazily deleted via `get`) free up room for new items.
- **Map Consistency**: Ensures `cache` and `expiry_map` remain in sync across all operations.
- **Alternating Operations**: Verifies stability under mixed read/write loads.

## 4. Conclusion
The current implementation satisfies all functional and non-functional requirements. The dual-map approach (`OrderedDict` + `dict`) provides an efficient and clear separation of concerns between LRU ordering and TTL management, while the comprehensive test suite safeguards against regression and edge-case failures.
