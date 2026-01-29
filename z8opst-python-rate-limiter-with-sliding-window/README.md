# Z8OPST - Python Rate Limiter with Sliding Window 

**Category:** sft

## Overview
- Task ID: Z8OPST
- Title: Python Rate Limiter with Sliding Window 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: z8opst-python-rate-limiter-with-sliding-window

## Requirements
- The fixed window algorithm must assign requests to windows based on timestamp calculation, not by incrementing a counter that resets. Two requests at 11:59:59.999 and 12:00:00.001 must count in different windows. To verify: send requests 1ms before and after a window boundary - they should count against separate limits.
- The sliding window log must automatically remove entries older than the window size without requiring explicit access. The buggy pattern stores all timestamps forever or only cleans on access, leaving orphaned entries. To verify: create 1000 keys, wait for expiry - memory should return to baseline without accessing those keys.
- The sliding window counter must calculate: previous_window_count * (1 - position_in_current_window) + current_window_count. To verify: at 30 seconds into a 60-second window, previous window should contribute 50% of its count to the total.
- Token bucket must calculate refill on-demand using elapsed time and track fractional tokens. The formula is tokens = min(capacity, tokens + elapsed * refill_rate). To verify: with refill_rate=0.5/sec, after 3 seconds exactly 1.5 tokens should be available, not rounded.
- The is_allowed() method must atomically check AND increment in a single locked operation. A check-then-increment pattern allows race conditions. To verify: 100 concurrent threads calling is_allowed() with limit=50 should result in exactly 50 True and 50 False.
- Locks must be per-key, not global. A global lock serializes all requests destroying throughput. To verify: rate limiting user A should not block concurrent requests from user B - operations on different keys must proceed in parallel.
- Configuration must validate that window_size > 0, requests_per_window > 0, refill_rate > 0, capacity > 0. Zero or negative values must raise ValueError immediately, not cause ZeroDivisionError or infinite loops later. To verify: creating a limiter with window_size=0 should raise ValueError with clear message.
- The get_remaining() method must calculate the current value based on algorithm state at call time, not return a cached value. For sliding window, this requires filtering timestamps against current time. To verify: call get_remaining(), wait 1 second, call again - value should reflect any expired entries.
- The get_reset_time() method must return when the oldest constraint expires. For fixed window: when current window ends. For sliding log: when oldest timestamp exits the window. To verify: for fixed window at 30 seconds in, reset time should be ~30 seconds in the future.
- The reset() method must completely clear all state for a key including timestamps, counts, and any auxiliary data. After reset, the next is_allowed() should succeed and get_remaining() should return the full limit. To verify: exhaust limit, call reset(), next request should succeed.

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
