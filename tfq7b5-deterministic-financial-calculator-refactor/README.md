# TFQ7B5 - Deterministic Financial Calculator Refactor

**Category:** sft

## Overview
- Task ID: TFQ7B5
- Title: Deterministic Financial Calculator Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tfq7b5-deterministic-financial-calculator-refactor

## Requirements
- Same input must produce identical output every time, regardless of server state, uptime, execution order, or concurrency.
- No hidden randomness or time-based offsets may influence calculation results.
- All operations (sin, cos, tan, log, ln, sqrt, square, inv, +, −, *, /) must match industry-standard references.
- Trigonometric functions must consistently use radians.
- Logarithms must consistently use the same base (base e for ln, base 10 for log).
- Results must match floating-point precision for both standard and edge-case inputs.
- Invalid or undefined operations (log(−1), sqrt(−16), division by zero, malformed inputs) must return explicit error indicators.
- No numeric “guesses” or substituted results may be returned for invalid input.
- Computational limits must be handled safely (overflow, underflow, infinity, NaN).
- Output strings must have a consistent decimal format (fixed or well-defined rounding).
- No artifacts like “?” or unexpected characters may appear in outputs.
- Calculations must be independent of memory variables, session state, operation counters, or any global/shared state.
- Multiple concurrent users must not affect each other’s results.
- Caching must be deterministic and cannot introduce non-reproducible behavior.
- No memory leaks or unbounded growth in long-running servers.
- Concurrency must be handled safely without data races or inconsistent results.
- Maintain the existing endpoint: POST /calculate

## Metadata
- Programming Languages: GO
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
