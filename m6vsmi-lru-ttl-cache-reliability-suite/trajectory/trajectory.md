
# Trajectory - Honest Assessment of LRU-TTL Cache

## 1. Project Requirements Analysis
The goal was to implement a robust **LRU Cache with TTL (Time-To-Live)**.
The implementation provided in `repository_after/lru_ttl_cache.py` (which I was instructed NOT to modify further) has several significant technical gaps and failures to meet robust engineering standards.

## 2. Technical Gaps & Failures
The following issues are present in the implementation and are explicitly demonstrated by the test suite:

### 2.1 Expiration Edge Case (Exact Timestamp)
- **Status**: **FAILED**
- **Detail**: The implementation uses `time.time() > expiry`. This means an item at the exact microsecond of its expiration is still treated as valid. Standard implementations typically treat `>= expiry` as expired.
- **Evidence**: `test_expires_exactly_at_capacity_limit` confirms that an item is still returned at $T = \text{expiry}$.

### 2.2 Capacity Edge Case (Zero/Negative)
- **Status**: **UNHANDLED / CRASH**
- **Detail**: If `capacity` is 0 or negative, any `put` operation will raise a `KeyError` because it attempts to `popitem` from an empty `OrderedDict`. The code does not validate or handle non-positive capacities.
- **Evidence**: `test_requirement_zero_capacity` and `test_requirement_negative_capacity` both verify this crash.

### 2.3 Proactive vs. Lazy Pruning
- **Status**: **SUBOPTIMAL**
- **Detail**: The cache only removes expired items during a `get` call for that specific key or an explicit `prune_expired` call. The `put` method is **not proactive**; it will evict the Least Recently Used (LRU) item to make room even if there are already expired items in the cache that could have been removed instead.
- **Evidence**: The implementation of `put` shows it only checks `len(cache) >= capacity` and immediately pops the LRU item without checking if other items are expired.

## 3. Testing & Coverage
### 3.1 Coverage Enforcement
- **Status**: **VERIFIED**
- **Enforcement**: Meta-tests in `tests/test_cache_meta.py` strictly enforce **100% code coverage**.
- **Report**: Coverage is verified for `repository_after/lru_ttl_cache.py`.

### 3.2 Reliability Suite
The test suite in `repository_after/test_cache.py` has been designed to "isolate" and expose the current implementation's behavior, including its flaws.
- **Isolating "At Expiry"**: Added specific overrides of `time.time` to check behavior at the exact boundary.
- **Isolating Capacity Boundaries**: Verified behavior at capacity 0, 1, and negative values.

## 4. Repository Cleanup
- All build artifacts (`__pycache__`, `.pytest_cache`, `.pyc`, `.coverage`) have been removed from the repository to ensure a clean solution state.

## 5. Conclusion
While the implementation logic for basic LRU and TTL works for most general cases, it lacks the defensive programming and boundary-case correctness required for a high-reliability component. The documentation and tests now accurately reflect these shortcomings.
