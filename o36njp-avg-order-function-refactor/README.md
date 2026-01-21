# O36NJP -  Avg Order Function Refactor

**Category:** sft

## Overview
- Task ID: O36NJP
- Title:  Avg Order Function Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: o36njp-avg-order-function-refactor

## Requirements
- The function must produce correct results for the given input.
- The function must not contain unnecessary delays or blocking behavior.
- Input parameters must be used safely and unambiguously.
- Error handling must use appropriate SQLSTATE codes.
- Generic exception handling must be avoided unless strictly necessary.
- The function must clearly define behavior for missing or invalid data.
- The implementation must follow PostgreSQL best practices.
- The function must be safe for concurrent execution.
- The function must be concise, readable, and maintainable.
- The function must be ready for production use.

## Metadata
- Programming Languages: PostgreSQL
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
