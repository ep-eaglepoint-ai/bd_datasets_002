# YM836N - Advanced Concurrent Systems Testing in Go

**Category:** sft

## Overview
- Task ID: YM836N
- Title: Advanced Concurrent Systems Testing in Go
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ym836n-advanced-concurrent-systems-testing-in-go

## Requirements
- Write deterministic, race-safe Go tests for ProcessParallelOptimized using only injected fakes or mocks for Downloader, Clock, and Rand; real timers, sleeps, and uncontrolled randomness are strictly forbidden.
- Verify strict preservation of input order in results and errs regardless of execution order, retries, failures, or dynamic worker scaling.
- Assert that concurrency limits are respected: active workers must never exceed MaxWorkers and must not drop below MinWorkers while work is pending, even under bursty input and adaptive scaling.
- Validate dynamic worker scaling behavior by proving that worker counts increase in response to queue pressure and stabilize without unbounded goroutine creation or starvation.
- Test per-item timeouts by simulating clock advancement and confirming that retries are aborted on deadline expiration and the correct context error is returned
- Test parent context cancellation by canceling mid-execution and verifying that job feeding, workers, retries, post-processing, and result aggregation terminate cleanly without deadlocks or misaligned output indices.
- Validate retry behavior precisely, including the exact number of download attempts per ID, exponential backoff growth, backoff capping at MaxBackoff, and deterministic jitter via injected randomness.
- Verify cache correctness and TTL semantics: cached hits must bypass downloads, expired entries must trigger re-downloads after simulated time advances, and cache access must be race-safe under concurrency.
- Validate request coalescing by ensuring that concurrent requests for the same ID result in exactly one underlying download, with all callers receiving the same result or error.
- Test circuit breaker behavior per bucket: consecutive failures must open the circuit after CircuitThreshold, reject further requests with ErrCircuitOpen during cooldown, and recover correctly after cooldown using a fake clock.
- Validate global rate limiting by proving that no more than GlobalRateLimit downloads are in-flight at any moment and that excess requests fail deterministically with ErrRateLimited.
- Verify post-processing behavior by asserting that successful values are transformed deterministically and failed values bypass transformation entirely.
- Assert correct hook invocation semantics: OnStart must fire exactly once, OnDone exactly once, and OnItem once per attempt, without assuming a fixed execution order.
- Include stress-style tests with high concurrency and duplicate IDs, and demonstrate the absence of goroutine leaks using deterministic signaling rather than time-based waits.

## Metadata
- Programming Languages: Go
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
