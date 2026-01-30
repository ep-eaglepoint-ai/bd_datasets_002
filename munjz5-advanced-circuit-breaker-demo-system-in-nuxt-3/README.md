# MUNJZ5 - Advanced Circuit Breaker Demo System in Nuxt 3

**Category:** sft

## Overview
- Task ID: MUNJZ5
- Title: Advanced Circuit Breaker Demo System in Nuxt 3
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: munjz5-advanced-circuit-breaker-demo-system-in-nuxt-3

## Requirements
- The system uses Nuxt 3 server routes as the only integration point for external service calls.
- The circuit breaker supports three states: CLOSED, OPEN, and HALF_OPEN.
- The breaker transitions from CLOSED to OPEN when the configured failure threshold is exceeded.
- The breaker transitions from OPEN to HALF_OPEN only after the configured reset interval elapses.
- The breaker transitions from HALF_OPEN to CLOSED after the required number of successful probe requests.
- The breaker immediately blocks upstream calls when in the OPEN state.
- The system returns a fallback response without calling the upstream service when the circuit is OPEN.
- Request failures and timeouts are tracked using a rolling time window.
- Upstream request timeouts are enforced and classified separately from other failures.
- Automatic retries are disabled for calls protected by the circuit breaker.
- The breaker state and runtime statistics are returned in the API response.
- Multiple simulated upstream services with different failure behaviors are available for demonstration.
- Circuit breaker state changes are logged on the server.
- A Nuxt 3 UI page allows users to trigger requests and observe state transitions in real time.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nuxt.js
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
