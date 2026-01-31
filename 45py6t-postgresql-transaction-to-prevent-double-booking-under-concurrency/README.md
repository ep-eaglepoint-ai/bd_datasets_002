# 45PY6T - PostgreSQL Transaction to Prevent Double Booking Under Concurrency

**Category:** sft

## Overview
- Task ID: 45PY6T
- Title: PostgreSQL Transaction to Prevent Double Booking Under Concurrency
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 45py6t-postgresql-transaction-to-prevent-double-booking-under-concurrency

## Requirements
- Two concurrent transactions must never both commit a booking for the same resource_id
- Must be implemented entirely with SQL statements inside one transaction (BEGIN … COMMIT/ROLLBACK)
- Exactly one attempt must succeed; competing attempts must wait or fail safely
- Must not rely on an empty SELECT … FOR UPDATE as a locking mechanism

## Metadata
- Programming Languages: SQL (PostgreSQL)
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
