# TO51AD - in memory caching system

**Category:** rl

## Overview
- Task ID: TO51AD
- Title: in memory caching system
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: to51ad-in-memory-caching-system

## Requirements
- The current implementation stores cache entries in a list and searches linearly through all entries on every get, set, and delete operation, resulting in O(n) complexity that makes the cache slower than not having a cache at all for large entry counts. The optimized implementation must use a dictionary as the primary storage: self._cache = {} where keys are the cache keys (or their hashable representation) and values are CacheEntry objects. The _find_entry method must be eliminated entirely, replaced with direct dictionary access: entry = self._cache.get(key). For complex keys that are not natively hashable (dicts, lists), create a _make_hashable(key) method that recursively converts dicts to frozensets of tuples and lists to tuples, enabling them to be used as dictionary keys. The custom _compute_key_hash method using character-by-character summation must be removed as it provides poor hash distribution and collisions. With dictionary storage, get operations must complete in O(1) average time regardless of cache size, verifiable by benchmark showing consistent performance from 1,000 to 1,000,000 entries.
- The current _evict_lru method iterates through all entries to find the least recently used one, resulting in O(n) eviction that occurs on every set operation when the cache is full. The optimized implementation must use collections.OrderedDict which maintains insertion/access order and supports O(1) move_to_end(key) operation. On every cache hit in get(), call self._cache.move_to_end(key) to mark it as recently used. For eviction, call self._cache.popitem(last=False) to remove the least recently used entry in O(1). Alternatively, implement a custom LRU structure with a doubly-linked list and dictionary: the list maintains access order, and the dictionary maps keys to list nodes for O(1) node location. When an entry is accessed, remove it from its current position and append to the tail in O(1). For eviction, remove from the head in O(1). The optimized implementation must handle 10,000 evictions in under 100ms compared to the current O(n²) behavior that takes seconds.
- The current implementation checks every entry's expiration status during get operations and cleanup by iterating through the entire cache, resulting in O(n) complexity. The optimized implementation must maintain a separate heap (using heapq module) containing (expiration_time, key) tuples ordered by expiration time. When setting an entry with TTL, push (created_at + ttl_seconds, key) onto the heap. During lazy cleanup (called periodically or on get misses), peek at the heap top: while the minimum expiration time is in the past, pop the entry and remove from the cache dictionary if it still exists and hasn't been updated. This provides O(log n) insertion and O(log n) removal of expired entries. Handle the case where an entry is updated with a new TTL by simply adding a new heap entry—the stale entry will be ignored when popped because the key either won't exist or will have a newer expiration. Include a cleanup method that processes up to k expired entries per call to amortize cleanup cost.
- The current _compute_key_hash method manually computes hashes by summing character codes, producing poor distribution and many collisions. The _keys_equal method performs deep comparison recursively. The optimized implementation must convert complex keys to immutable hashable types once during set/get and reuse Python's built-in hash. Implement _normalize_key(key) that: for dicts, returns tuple(sorted((k, self._normalize_key(v)) for k, v in key.items())); for lists, returns tuple(self._normalize_key(item) for item in key); for other hashable types, returns the key unchanged. The normalized key can be used directly as a dictionary key. Store a mapping from normalized keys to original keys if original key retrieval is needed for keys() method. This eliminates the need for _keys_equal since dictionary lookup handles equality. The normalization must be cached to avoid repeated conversion: store entries as {normalized_key: CacheEntry} where CacheEntry contains the original key. Complex key operations must complete within 2x the time of simple string key operations.
- The current implementation builds the stats_log string through repeated concatenation (self.stats_log = self.stats_log + ...), resulting in O(n²) total complexity for n log entries as each concatenation creates a new string. The optimized implementation must use collections.deque with maxlen parameter: self._stats_log = deque(maxlen=10000) storing individual log entries as strings. The export_stats_log method joins entries only when called: return '\n'.join(self._stats_log). Even better, provide a configuration option to disable logging entirely: if self._logging_enabled: self._stats_log.append(entry). In production mode with logging disabled, no string operations occur during cache operations. The stats counters (hits, misses) must use atomic operations or accept slight inaccuracy to avoid lock contention: consider using threading.local() for per-thread counters that are aggregated on demand. The logging overhead must be less than 1% of operation time when enabled and zero when disabled.
- The get_lru_entries, get_mru_entries, and get_most_accessed methods all use O(n²) bubble sort to order entries. The optimized implementation must use Python's built-in sorted() function with key parameters: sorted(entries, key=lambda e: e.last_accessed) for O(n log n) sorting. For the top-k use case (getting only top 10 results), use heapq.nsmallest(k, entries, key=lambda e: e.last_accessed) or heapq.nlargest which is more efficient than full sorting when k << n. Even better, maintain running statistics incrementally: use a separate OrderedDict for access-time ordering that's already maintained by LRU logic, and a heap or sorted list for access counts updated on each access. The get_most_accessed method could maintain a heap of (access_count, key) pairs updated on each access for O(log n) updates and O(k log n) top-k retrieval. Performance tests must show statistics retrieval completing in under 10ms for 100,000 entries.
- The current implementation performs copy.deepcopy() on keys and values during set, get, keys, values, items, and nearly every other operation, adding significant overhead especially for large nested structures. The optimized implementation must minimize copying: on set(), store values directly unless they are mutable containers; on get(), return copies only for mutable types (list, dict, set) to prevent callers from modifying cached data. For immutable types (str, int, tuple, frozenset), return directly without copying. Implement a _needs_copy(value) helper that checks isinstance(value, (dict, list, set, bytearray)). For keys, if they've been normalized to immutable tuples, no copying is needed. Consider offering a get_unsafe(key) method that returns the actual cached reference for performance-critical code that promises not to mutate. The copy overhead must be eliminated for immutable values and reduced by 50%+ for mutable values through shallow copying where deep copying isn't necessary.
- The find_by_prefix method iterates all entries and performs character-by-character comparison for prefix matching. The find_by_pattern method uses a custom wildcard matching implementation. The optimized implementation must use Python's built-in string methods: for prefix matching, use key_str.startswith(prefix) which is implemented in C and much faster. For pattern matching with * and ? wildcards, convert the pattern to a regular expression using re.escape() for literal parts and appropriate regex syntax for wildcards, then use the compiled pattern: import re; regex = re.compile(pattern.replace('*', '.*').replace('?', '.')); regex.match(key_str). Pre-compile patterns that are used frequently. For applications with heavy prefix queries, consider maintaining a trie or sorted key list with binary search for O(log n + m) prefix queries where m is result count. Pattern searches must complete 10x faster than the current character-by-character implementation.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
