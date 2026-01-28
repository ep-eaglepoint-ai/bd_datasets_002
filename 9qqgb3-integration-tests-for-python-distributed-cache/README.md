# 9QQGB3 - Integration Tests for Python Distributed Cache

**Category:** sft

## Overview
- Task ID: 9QQGB3
- Title: Integration Tests for Python Distributed Cache
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9qqgb3-integration-tests-for-python-distributed-cache

## Requirements
- TTL expiration must be precise to the second. When a key is set with ttl=10,  accessing it at 9.9 seconds must return the value, but accessing at 10.0+ seconds  must return None and increment the miss counter. Tests must use freezegun to control  time without real delays. The get() method should remove expired entries from internal  storage when detected, not just return None.
- LRU eviction must remove the least recently accessed entry when cache reaches  max_size. If cache has max_size=3 with keys ["a", "b", "c"] and "b" is accessed via  get(), then adding "d" must evict "a" (not "b" or "c"). Both get() and set() operations  must update the access order. The evictions counter in stats() must increment by exactly  1 per eviction.
- Concurrent increment operations must be atomic and never lose counts. If 10 threads  each call increment("counter") 100 times starting from 0, the final value must be  exactly 1000 with no race conditions. The implementation must use proper locking (RLock)  to ensure thread safety. increment() on a non-existent key must initialize it to the  increment amount, not 0 then increment.
- Statistics tracking must be accurate under concurrent access. The stats() method must  return a dict with hits, misses, evictions, and size counters that match actual operations.  A cache hit must increment hits by 1, a miss (including expired key access) must increment  misses by 1, and size must reflect len(internal_storage) at call time. The clear() method  must reset all counters to 0
- Pattern matching with keys(pattern) must support glob-style wildcards (* and ?).  keys("user:*") must return all keys starting with "user:", keys("key?") must return  keys like "key1" and "key2" but not "key10". delete_pattern("user:*") must delete only  matching keys and return the count deleted. Empty patterns or patterns with no matches  must return empty lists, not raise errors.
- The save(filepath) method must persist cache state to disk as pickle format, excluding  expired entries at save time. If a key has ttl=10 and 11 seconds have passed, save()  must not include it. Statistics (hits, misses, evictions) must be preserved in the saved  file. The method must handle file I/O errors gracefully without corrupting existing cache  state.
- The load(filepath) method must restore cache state from disk, recreating TTL timers  correctly. If a key was saved with expires_at=1704110410 and current time is 1704110400,  the loaded key must have 10 seconds remaining TTL. Keys that expired between save and  load must be discarded during load. Statistics must be restored to saved values, not  reset to 0.
- Background cleanup must run every 60 seconds and remove expired entries without  blocking cache operations. The cleanup thread must be started in __init__ and stopped  gracefully in close(). Tests must verify cleanup by manually calling the cleanup method  (to avoid 60-second waits) and checking that expired keys are removed from internal  storage.
- Thread safety must be guaranteed for all public methods under concurrent access.  Multiple threads calling get/set/delete/increment simultaneously must not corrupt  internal state or cause race conditions. The implementation must use threading.RLock  (not Lock) to allow re-entrant calls. Tests must spawn 10+ threads performing 50+  operations each and verify no data corruption occurs.
- Edge cases must be handled gracefully: increment() on a string value must raise  ValueError with a clear message, get() on a non-existent key must return None (not  raise KeyError), exists() on an expired key must return False and remove it from  storage, and operations on an empty cache must not raise exceptions. Tests must verify  unicode keys/values, very long keys (10000+ chars), and max_size=1 work correctly.

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
