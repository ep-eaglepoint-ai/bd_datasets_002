# 7XLC0W - Thread-Safe Token Bucket Rate Limiter

**Category:** sft

## Overview
- Task ID: 7XLC0W
- Title: Thread-Safe Token Bucket Rate Limiter
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7xlc0w-thread-safe-token-bucket-rate-limiter

## Requirements
- The class must implement the Token Bucket algorithm (not Leaky Bucket or Fixed Window).
- The allow_request method must be strictly thread-safe; concurrent calls must not consume more tokens than available.
- The implementation must use a lazy refill mechanism (calculating tokens on access) rather than background threads or timers
- The solution must use floating-point arithmetic for time and token counts to ensure sub-millisecond precision and prevent rate drift.
- The solution must guarantee O(1) memory complexity by storing only the current state, not request history.
- he method must be non-blocking; it must return a boolean immediately and never use time.sleep().
- The system must handle negative time deltas (system clock adjustments) gracefully without crashing or adding infinite tokens.
- The implementation must strictly use the Python Standard Library (no external dependencies).

## Metadata
- Programming Languages: Python (3.11)
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
