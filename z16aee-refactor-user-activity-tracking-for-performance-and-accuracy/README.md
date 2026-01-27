# Z16AEE - Refactor User Activity Tracking for Performance and Accuracy

**Category:** sft

## Overview
- Task ID: Z16AEE
- Title: Refactor User Activity Tracking for Performance and Accuracy
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: z16aee-refactor-user-activity-tracking-for-performance-and-accuracy

## Requirements
- Maintain existing function signature
- Preserve return shapes and field names
- Improve performance without changing behavior
- Avoid introducing caching, concurrency, or new helper functions
- Ignore activity records with null duration
- Include users without activity with zero counts

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
