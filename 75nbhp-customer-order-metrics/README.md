# 75NBHP - Customer Order Metrics

**Category:** sft

## Overview
- Task ID: 75NBHP
- Title: Customer Order Metrics
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 75nbhp-customer-order-metrics

## Requirements
- Replace row-by-row processing with set-based logic.
- Eliminate function calls on indexed columns in WHERE clauses.
- Ensure the orders table is scanned no more than once.
- Preserve exact result values for all statuses.
- Handle large customer histories efficiently.
- Reduce CPU usage under high concurrency.
- Keep the logic readable and maintainable.
- Ensure the function remains deterministic.
- Do not change the return structure.

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
