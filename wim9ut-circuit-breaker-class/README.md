# WIM9UT - circuit breaker class

**Category:** sft

## Overview
- Task ID: WIM9UT
- Title: circuit breaker class
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wim9ut-circuit-breaker-class

## Requirements
- The circuit must implement CLOSED, OPEN, and HALF_OPEN states as an enum. In CLOSED state, all calls pass through to the wrapped function. When the failure count within a time window exceeds `failure_threshold`, the circuit transitions to OPEN. In OPEN state, all calls immediately raise `CircuitOpenError` without invoking the wrapped function. After `recovery_timeout` seconds in OPEN state, the circuit transitions to HALF_OPEN where the next call is allowed through as a test.
- Failures must be tracked within a configurable `failure_window` (in seconds), not as a simple counter that never resets. Only failures that occurred within the window should count toward the threshold. This prevents a circuit from staying open forever due to ancient failures and allows natural recovery when failure bursts are temporary.
- In HALF_OPEN state, if the test call succeeds, the circuit must reset its failure count and transition back to CLOSED state. If the test call fails, the circuit must immediately transition back to OPEN state and reset the recovery timeout. Only one request should be allowed through during HALF_OPEN to prevent overwhelming a recovering service.
- The constructor must accept an `exceptions` parameter (tuple of exception types) specifying which exceptions count as failures. Exceptions not in this tuple should propagate normally without affecting the circuit state. This allows distinguishing between infrastructure failures (which should trip the circuit) and business logic exceptions (which should not).
- The class must support use as a decorator via `@circuit_breaker` syntax that wraps a function. It must also support direct call wrapping via `circuit.call(func, *args, **kwargs)`. Both interfaces must provide identical behavior and thread-safety guarantees.
- The `state` property must return the current circuit state. The `failure_count` property must return current failures in the window. The `reset()` method must manually close the circuit and clear failure history. The `trip()` method must manually open the circuit. These controls enable testing and operational intervention.

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
