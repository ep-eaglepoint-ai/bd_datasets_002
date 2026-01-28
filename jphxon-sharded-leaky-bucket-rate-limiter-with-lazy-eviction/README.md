# JPHXON - Sharded Leaky Bucket Rate Limiter with Lazy Eviction

**Category:** sft

## Overview
- Task ID: JPHXON
- Title: Sharded Leaky Bucket Rate Limiter with Lazy Eviction
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jphxon-sharded-leaky-bucket-rate-limiter-with-lazy-eviction

## Requirements
- The struct must contain a slice of shards (e.g., []*Shard), where each shard has its own Map and Mutex. Using a single map or sync.Map is an automatic failure.
- The code must convert userID to a shard index using a consistent hash algorithm (like FNV or DJB2). Random assignment is a failure.
- The logic must calculate the new level as max(0, old_level - (elapsed_time * drain_rate)) + request_amount. Simple counter increments or fixed-window resets are failures.
- Lazy Eviction: The system must demonstrate logic to remove a user key from the map if their calculated level drops to zero. This ensures memory is reclaimed.
- Volume tracking must use float64. Integer math is insufficient for "milliliter per second" decay rates over short intervals.
- Access to a specific shard's map must be protected by that shard's Mutex. Accessing the map without a lock or using the wrong lock is a race condition failure.
- The check (Can I pour?) and the update (Add to bucket) must happen within the same lock scope. Releasing the lock between check and update introduces a race condition (Double Spending).

## Metadata
- Programming Languages: GoLang 1.18
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
