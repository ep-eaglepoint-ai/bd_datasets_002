# OMY43L - rate-limiting-library

**Category:** sft

## Overview
- Task ID: OMY43L
- Title: rate-limiting-library
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: omy43l-rate-limiting-library

## Requirements
- The implementation must include an abstract base class named RateLimiter that uses the abc module to define the interface contract. This base class must declare two abstract methods: is_allowed(client_id: str) -> bool for simple allow/deny decisions, and try_acquire(client_id: str) -> RateLimitResult for detailed quota information. The RateLimitResult must be a dataclass or named tuple containing five fields: allowed (bool indicating if request is permitted), remaining (int count of remaining requests or tokens), limit (int total configured limit), reset_at (float Unix timestamp when quota resets or refills), and retry_after (float seconds to wait before retrying if denied). The base class must also define abstract properties for algorithm_name returning a string identifier, and for current_config returning a dictionary of the limiter's configuration. A class method named from_config must be defined that accepts a dictionary and returns an appropriate RateLimiter subclass instance based on an "algorithm" key in the config. All three algorithm implementations (TokenBucketLimiter, SlidingWindowLogLimiter, FixedWindowLimiter) must inherit from this base class and implement all abstract methods.
- The TokenBucketLimiter class must maintain per-client state consisting of current token count (float for fractional tokens) and last update timestamp. When is_allowed or try_acquire is called, the implementation must first calculate elapsed time since last update using time.monotonic() to avoid issues with system clock changes, then add tokens at the configured refill rate (tokens = elapsed_seconds * refill_rate), capping at the bucket capacity. If at least one token is available, consume one token and return allowed=True with remaining set to floor of current tokens. The constructor must accept capacity (int, maximum tokens/burst size) and refill_rate (float, tokens added per second) parameters. The implementation must handle edge cases including: first request from a new client (initialize with full bucket), requests arriving faster than refill rate (properly deny when depleted), very long gaps between requests (cap at capacity, don't overflow), and concurrent requests (use locking to prevent race conditions on token count). The reset_at field in RateLimitResult must indicate when the next token will be available if currently denied, calculated as current_time + (1.0 / refill_rate).
- The SlidingWindowLogLimiter class must maintain a dictionary mapping client IDs to lists of request timestamps (or collections.deque for O(1) removal from front). When checking if a request is allowed, the implementation must first remove all timestamps older than (current_time - window_size) from the client's log, then check if the remaining count is below the configured limit. If allowed, append the current timestamp to the log before returning. The constructor must accept limit (int, maximum requests per window) and window_size (float, window duration in seconds) parameters. The pruning operation must occur on every request to prevent unbounded memory growth, and must be implemented efficiently using deque.popleft() in a while loop or list slicing rather than creating new lists. The remaining field must return (limit - current_count), and reset_at must return the timestamp of the oldest request in the window plus window_size (when the oldest request will expire and free up quota). For clients with no recent requests, return full remaining quota. Memory usage per client must be bounded to O(limit) timestamps since requests beyond the limit are denied.
- The FixedWindowLimiter class must maintain per-client state consisting of window start timestamp and request count for that window. Windows must align to clock boundaries based on window_size: for a 60-second window, boundaries are at :00, :01:00, :02:00, etc. of each hour. When checking requests, first determine the current window by computing floor(current_time / window_size) * window_size as the window start. If the client's stored window start differs from current window, reset their count to zero. Then check if count is below limit, increment if allowed. The constructor must accept limit (int) and window_size (float, seconds) parameters, plus an optional use_sliding_approximation (bool, default False) parameter. When sliding approximation is enabled, the effective count must be calculated as: previous_window_count * (1 - elapsed_ratio) + current_window_count, where elapsed_ratio is the fraction of the current window that has elapsed. This smooths the boundary condition where a client could make limit requests at :59 and limit more at :00. The reset_at field must return the timestamp when the current window ends, calculated as window_start + window_size.
- Each rate limiter implementation must use threading.Lock or threading.RLock to protect all mutable state access. However, a single global lock for all clients is unacceptable as it creates a bottleneck. The implementation must use per-client locking by maintaining a dictionary of locks alongside the dictionary of client state, or by using a lock-per-bucket strategy that hashes client IDs to a fixed number of locks (e.g., 256 locks) to balance memory usage against contention. The locking strategy must be documented in class docstrings. Lock acquisition must use context managers (with lock:) to ensure proper release even when exceptions occur. The implementation must handle the case where two threads simultaneously process the first request from a new client by using double-checked locking or setdefault patterns to avoid race conditions during client initialization. A stress test creating 10 threads each making 1000 requests for 100 different clients must complete without deadlocks, race conditions, or assertion errors, and the final state must be consistent with the rate limits configured.
- The implementation must include a RateLimiterFactory class with a create(config: dict) -> RateLimiter class method that instantiates the appropriate limiter based on configuration. The config dictionary must support an "algorithm" key with values "token_bucket", "sliding_window", or "fixed_window". For token bucket, required keys are "capacity" and "refill_rate". For sliding window, required keys are "limit" and "window_size". For fixed window, required keys are "limit" and "window_size", with optional "sliding_approximation" defaulting to False. The factory must raise ValueError with descriptive messages for unknown algorithms, missing required keys, or invalid value types. The factory must also support a create_from_yaml(filepath: str) and create_from_json(filepath: str) method for loading configuration from files, returning a dictionary mapping limiter names to RateLimiter instances for configurations that define multiple limiters. Example config structure: {"limiters": {"api_default": {"algorithm": "token_bucket", "capacity": 100, "refill_rate": 10}, "login": {"algorithm": "fixed_window", "limit": 5, "window_size": 60}}}.
- The library must include a rate_limit decorator factory that can be applied to functions to automatically enforce rate limiting. The decorator must accept a RateLimiter instance and a callable that extracts the client ID from the function's arguments (e.g., lambda args, kwargs: kwargs.get("user_id")). When the rate limit is exceeded, the decorator must raise a RateLimitExceeded exception containing the RateLimitResult with retry_after information. The decorator must work with both synchronous and asynchronous functions (using functools.wraps to preserve function metadata). Additionally, the library must provide a RateLimitContext context manager that can be used as: with RateLimitContext(limiter, client_id) as result: ... which raises RateLimitExceeded on entry if the limit is exceeded, or yields the RateLimitResult if allowed. The RateLimitExceeded exception must inherit from Exception and include limit_result, client_id, and limiter_name attributes for error handling and logging purposes. Both the decorator and context manager must properly handle the case where the wrapped code raises an exception (the request was still counted against the limit).
- The implementation must include a test file using pytest or unittest that achieves at least 90% code coverage. Tests must verify: Token Bucket correctly allows burst up to capacity then enforces sustained rate, properly refills over time, handles concurrent access without exceeding limits; Sliding Window Log correctly tracks requests within window, properly expires old requests, handles window boundaries accurately; Fixed Window Counter resets at window boundaries, sliding approximation smooths boundary spikes, handles clock-aligned windows correctly. Edge case tests must include: first request from new client, requests exactly at rate limit, requests after long idle period, concurrent requests from same client, very short and very long window sizes, zero remaining quota behavior, and retry_after accuracy. Performance tests must verify that 100,000 is_allowed calls complete in under 1 second for each algorithm, and that memory usage stays bounded when tracking 10,000 clients. All tests must include descriptive names and docstrings explaining what behavior is being verified.

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

## Features
- Unified `RateLimiter` interface.
- Thread-safe implementations with per-client locking.
- Support for multiple algorithms:
  - **Token Bucket** (burst-aware)
  - **Sliding Window Log** (precise)
  - **Fixed Window Counter** (simple, with sliding approximation)
- Factory for configuration-based instantiation.
- Decorator and context manager for easy integration.

## Testing and Evaluation

### Run tests for the implementation (expected all pass)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
```

**Expected behavior:**
- Rate Limit tests: ✅ PASS

#### Run evaluation (collects task metrics and generates evaluation report)
```bash
docker compose run --rm app python evaluation/evaluation.py
```

This will:
- Run tests for repository_after implementations
- Generate a report at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`

#### Run evaluation with custom output file
```bash
docker compose run --rm app python evaluation/evaluation.py --output /path/to/custom/report.json
```

## Patches
To generate a patch for the implementation made:
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```