# EIZVIG - Java Thread-Safe LRU Cache - Deadlock and Lost Update Fix

**Category:** sft

## Overview
- Task ID: EIZVIG
- Title: Java Thread-Safe LRU Cache - Deadlock and Lost Update Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: eizvig-java-thread-safe-lru-cache-deadlock-and-lost-update-fix

## Requirements
- Use consistent lock ordering or a single lock to prevent deadlocks. Currently get() acquires mapLock then listLock, while put() acquires listLock then mapLock. This opposite ordering causes circular wait conditions. Either use a single lock for all operations or enforce strict mapLock-before-listLock ordering everywhere.
- Protect HashMap access with synchronization. The cache uses HashMap which is not thread-safe. All map operations (get, put, remove, containsKey) must be synchronized, or the map must be replaced with a thread-safe alternative that still allows LRU ordering.
- Make size counter updates atomic with map/list modifications. The size field is modified without proper synchronization, causing it to become negative or exceed the maximum. All increments and decrements must occur while holding the same locks that protect the map and list
- Ensure remove() acquires both locks before modifying the list. Currently remove() only synchronizes on mapLock but calls removeFromList() which modifies the linked list. This causes concurrent get() operations to see corrupted list state.
- Clear entry's prev/next pointers after removal from list. When an entry is removed, its prev and next pointers still reference other nodes. This causes issues if the entry is somehow accessed again and can prevent garbage collection of removed entries.
- Ensure clear() acquires all necessary locks. Currently clear() only acquires mapLock but sets head and tail to null. Concurrent operations accessing the list without mapLock will see inconsistent state.
- Make eviction atomic with insertion in put(). The size check, eviction, and insertion are not atomic. Between checking size >= maxSize and calling evictLRU(), another thread could also evict, causing the cache to shrink below intended capacity, or both threads could skip eviction, exceeding capacity.
- Handle concurrent removal during get() operations. An entry could be removed from the cache between when get() retrieves it from the map and when it calls moveToFront(). This causes operations on stale entries that are no longer in the list, corrupting the list structure.
- Ensure size() returns accurate count under concurrency. The size() method reads the size field without synchronization, returning stale values. It should acquire the same lock(s) used when modifying size.
- Validate that evictLRU() decrements size correctly. When evicting the LRU entry, the size counter must be decremented. Missing this causes the cache to think it has more entries than it does, leading to unnecessary evictions.

## Metadata
- Programming Languages: Java
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
