# A8B194 - retry-decorator

**Category:** sft

## Overview
- Task ID: A8B194
- Title: retry-decorator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: a8b194-retry-decorator

## Requirements
- The `@retry` decorator must accept `max_attempts`, `delay`, `backoff`, and `exceptions` as keyword arguments. When applied to a function, it must attempt the function up to `max_attempts` times before raising `RetryError`. The delay between attempts must follow the specified backoff strategy: "fixed" uses the same delay each time, "linear" increases delay by adding the base delay each attempt (delay, 2*delay, 3*delay), and "exponential" doubles the delay each attempt (delay, 2*delay, 4*delay). Invalid backoff strategy values must raise `ValueError` at decoration time.
- When decorating a regular function, use `time.sleep()` for delays. When decorating an async function (detected via `asyncio.iscoroutinefunction()`), the wrapper must also be async and use `await asyncio.sleep()`. The decorated function must behave identically to the original except for retry behavior—return values, exceptions (after retry exhaustion), and function metadata must be preserved. Use `functools.wraps` to preserve `__name__`, `__doc__`, and other attributes.
- The `exceptions` parameter must accept a tuple of exception classes. Only exceptions that are instances of these classes (checked via `isinstance()`) should trigger a retry. Other exceptions must propagate immediately without retry. If `exceptions` is not provided, default to catching all `Exception` subclasses. After all retries are exhausted, wrap the final exception in `RetryError` which must store the original exception in a `cause` attribute and the attempt count in an `attempts` attribute.
- Handle edge cases: `max_attempts=1` means try once with no retries, `max_attempts=0` or negative must raise `ValueError`, `delay` must be non-negative. If the function succeeds on any attempt, return immediately without further retries. Log or print retry attempts (optional but recommended) showing attempt number, exception type, and delay before next attempt. The `RetryError` message must clearly state how many attempts were made and include the original exception message.

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
