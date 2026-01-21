# UXGS88 - task-management

**Category:** sft

## Overview
- Task ID: UXGS88
- Title: task-management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: uxgs88-task-management

## Requirements
- Must efficiently handle upto 20 workers
- Must efficiently handle upto 1000 tasks
- Counting all valid distributions in < 2 seconds for worst-case (dense
- Finding max skill assignment in < 200ms
- Enumerating 100 distributions in < 100ms

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
