# K5IQQ3 - Update_Offset_with_Cursor

**Category:** rl

## Overview
- Task ID: K5IQQ3
- Title: Update_Offset_with_Cursor
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k5iqq3-update-offset-with-cursor

## Requirements
- Cursor Pagination: Use where (id < last_id) for next page; return nextCursor if extra row.
- Verification: Benchmark 1M records paginate in <1s/page.

## Metadata
- Programming Languages: JavaScript, TypeScript
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
