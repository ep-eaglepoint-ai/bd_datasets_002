# QV76EY - lru cache python

**Category:** sft

## Overview
- Task ID: QV76EY
- Title: lru cache python
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qv76ey-lru-cache-python

## Requirements
- Implement the cache using a dictionary mapping keys to doubly linked list nodes, and a doubly linked list maintaining access order (most recent at head, least recent at tail). The `get(key)` operation must return the value in O(1) by dictionary lookup, and move the accessed node to the head. The `put(key, value)` operation must update existing entries or create new ones in O(1), moving the node to head and evicting from tail if over capacity
- Implement a `Node` class with `key`, `value`, `prev`, and `next` attributes. Implement helper methods: `_add_to_head(node)` to insert a node right after the dummy head, `_remove_node(node)` to remove a node from its current position, and `_move_to_head(node)` combining remove and add. Use dummy head and tail nodes to simplify edge cases at list boundaries.
- When `put` is called and the cache is at capacity with a new key, remove the node just before the dummy tail (the LRU item), delete its key from the dictionary, then add the new item. The evicted item must be the one accessed longest ago. Track the current size and compare against capacity to determine when eviction is needed.
- Handle capacity of 1 (single item cache with immediate eviction on new items). Handle updating existing keys (should not increase size, just update value and move to head). Handle getting non-existent keys (return -1 without modifying the list). Ensure the cache works with various key types (strings, integers, tuples) and value types including None.

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
