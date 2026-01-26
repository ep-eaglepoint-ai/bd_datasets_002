# UTKJHD - Pytest tests for a Rate Limiter

**Category:** sft

## Overview
- Task ID: UTKJHD
- Title: Pytest tests for a Rate Limiter
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: utkjhd-pytest-tests-for-a-rate-limiter

## Requirements
- Cover the first request for a key with no existing state.
- Cover multiple requests within the same window and validate increments.
- Cover behavior when the request limit is exceeded.
- Cover window reset behavior after the window duration elapses.
- Validate the remaining value in all scenarios.
- Validate the reset_in_seconds value in all scenarios.
- Verify correct interactions with the key–value store get and set methods.
- Verify that TTL values passed to the store are correct.
- Include tests for invalid limiter configuration values.
- Include tests for missing or empty keys.
- Do not modify the production code.
- Avoid real-time dependencies by passing now explicitly.
- Use mocks or fakes for the KeyValueStore.
- Ensure tests do not depend on execution order.

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
