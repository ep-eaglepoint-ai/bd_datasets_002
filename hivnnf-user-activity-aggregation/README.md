# HIVNNF -  User Activity Aggregation

**Category:** sft

## Overview
- Task ID: HIVNNF
- Title:  User Activity Aggregation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hivnnf-user-activity-aggregation

## Requirements
- Replace looping logic with set-based aggregation.
- Avoid applying functions to timestamp columns in filters.
- Ensure efficient index usage on activity_time.
- Preserve exact counts and timestamps.
- Optimize for tables with hundreds of millions of rows.
- Reduce memory and CPU usage.
- Ensure correctness for edge cases
- Keep the function readable.
- Maintain deterministic results.
- Function signature must not change.
- No schema or index changes allowed.
- No temporary tables or materialized views.
- Behavior must remain unchanged.

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
