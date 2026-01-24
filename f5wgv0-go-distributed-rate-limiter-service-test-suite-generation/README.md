# F5WGV0 - Go Distributed Rate Limiter Service  Test Suite Generation

**Category:** sft

## Overview
- Task ID: F5WGV0
- Title: Go Distributed Rate Limiter Service  Test Suite Generation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f5wgv0-go-distributed-rate-limiter-service-test-suite-generation

## Requirements
- Unit test coverage must exceed eighty percent for core algorithms including token bucket calculation, sliding window burst detection, token refill logic, and bucket data parsing. All unit tests must complete within one second each
- Integration tests must validate distributed behavior using at least three rate limiter instances sharing the same Redis backend. When three instances each consume thirty tokens from a bucket of one hundred, the shared state must reflect total consumption with no more than five percent variance.
- Failure scenario tests must cover Redis unavailability with both fail-open and fail-closed configurations. Fail-open must fall back to local cache. Fail-closed must return error containing "rate limiter unavailable".
- Clock skew tests must verify instances with clocks five seconds apart do not allow rate limit bypass. Token refill calculations must remain consistent within ten percent variance.
- Race condition tests must pass with Go race detector enabled. One hundred concurrent goroutines calling Allow, AllowN, SetFailOpen, Reset, and GetStatus must complete without races or panics.
- Performance benchmarks must show p99 latency below one millisecond for Allow operations against real Redis with at least ten thousand operations measured.
- All tests must use testify for assertions. Integration tests must use testcontainers-go for real Redis instances
- Tests must not modify the rate limiter implementation. Test files must be additive only
- Total test execution must complete under five minutes. Tests must pass ten consecutive runs with zero flaky failures

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
