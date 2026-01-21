# O8TNBE - Python LRU Cache with TTL Feature Addition

**Category:** sft

## Overview
- Task ID: O8TNBE
- Title: Python LRU Cache with TTL Feature Addition
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: o8tnbe-python-lru-cache-with-ttl-feature-addition

## Requirements
- Implement LRU (Least Recently Used) eviction policy. When cache reaches maxsize and a new entry needs to be added, evict the entry that was accessed least recently. Both cache hits and cache insertions must update the entry's recency status using move_to_end or equivalent.
- Implement TTL (Time-To-Live) expiration with per-key checking. Each cache entry must track its creation timestamp. When a specific key is accessed, check if THAT entry is expired before returning it. Do not rely solely on bulk cleanup to catch all expired entries. Expired entries increment expirations counter.
- Implement thread-safe cache operations using threading.Lock or equivalent. All cache reads, writes, evictions, and statistics updates must be protected. Do not hold lock during slow function execution to avoid blocking concurrent callers.
- Generate cache keys from function arguments including *args and **kwargs. Use inspect.signature with bind() and apply_defaults() to normalize arguments. Ensure f(a=1, b=2) and f(b=2, a=1) produce the same cache key. Ensure f(x) and f(x, default=True) share cache entry when default matches function signature.
- Handle unhashable arguments gracefully. If arguments cannot be hashed for cache key generation, bypass the cache and call the function directly rather than raising an exception. Increment misses counter when bypassing.
- Add cache_info() method to decorated function that returns CacheStats dataclass with current counts for hits (cache returns existing value), misses (cache computes new value), evictions (LRU removal when full), and expirations (TTL removal).
- Add cache_clear() method to decorated function that removes all entries from cache and resets all statistics counters (hits, misses, evictions, expirations) to zero. Must be thread-safe.
- Preserve decorated function metadata using functools.wraps. The decorated function's __name__, __doc__, and other attributes must match the original function.

## Metadata
- Programming Languages: python
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
