# 9EXPGO - Customer Billing Optimization

**Category:** sft

## Overview
- Task ID: 9EXPGO
- Title: Customer Billing Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9expgo-customer-billing-optimization

## Requirements
- The function must produce correct billing results
- The function must perform efficiently on large datasets
- The function must scale safely under concurrent execution
- The function must use appropriate standard SQLSTATE error codes
- The function must handle invalid input and no-data cases correctly
- The function must be safe, deterministic, and side-effect free
- The function must follow PostgreSQL best practices
- The function signature must remain unchanged

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
