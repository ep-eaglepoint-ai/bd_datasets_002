# RK203I - Secure_API_Calls_with_Rate_Limiting

**Category:** rl

## Overview
- Task ID: RK203I
- Title: Secure_API_Calls_with_Rate_Limiting
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rk203i-secure-api-calls-with-rate-limiting

## Requirements
- Token Bucket: Refill 100/min, burst 10; deny with 429.
- Verification: Test 110 calls/min denies 10.

## Metadata
- Programming Languages: - JavaScript, - TypeScript
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
