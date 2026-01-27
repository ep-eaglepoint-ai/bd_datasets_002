# Q5TUEE - Optimize User Activity Analytics Aggregation

**Category:** sft

## Overview
- Task ID: Q5TUEE
- Title: Optimize User Activity Analytics Aggregation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: q5tuee-optimize-user-activity-analytics-aggregation

## Requirements
- Maintain function signatures and return types
- Avoid caching, concurrency, or helper functions
- Reduce redundant computations and repeated scans
- Support filtering by time window and preserve result order

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
