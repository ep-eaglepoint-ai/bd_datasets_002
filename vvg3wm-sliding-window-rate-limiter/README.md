# VVG3WM - sliding window rate limiter

**Category:** sft

## Overview
- Task ID: VVG3WM
- Title: sliding window rate limiter
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vvg3wm-sliding-window-rate-limiter

## Requirements
- The `is_allowed(key)` method must return `True` if the key hasn't exceeded its limit, `False` otherwise. When allowed, it should record the request. The limiter must track requests per unique key independently.
- Requests older than the time window must not count toward the limit. Use timestamps to track when each request occurred and filter out expired ones. The window "slides" with each check.
- The constructor must accept `max_requests` (int) and `window_seconds` (float). The `get_remaining(key)` method must return how many requests the key has left. The `reset(key)` method must clear a key's history.
- Old request timestamps must be cleaned up to prevent unbounded memory growth. The `cleanup()` method should remove all expired entries. Keys with no recent requests should be removable.
- The implementation must be safe to use in multi-threaded environments. Proper synchronization or locking mechanisms should be used to avoid race conditions.
- The class should allow for an optional injectable time source (e.g., a `time_function` parameter), which defaults to `time.time()`, to make unit testing predictable and deterministic.

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
