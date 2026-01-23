# 5L9UEG - Idempotent Processor

**Category:** sft

## Overview
- Task ID: 5L9UEG
- Title: Idempotent Processor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5l9ueg-idempotent-processor

## Requirements
- A request must not be executed more than once
- Repeated requests must return the same result
- Concurrent duplicate requests must not cause duplication
- Failed requests must not be reprocessed
- The solution must be thread-safe
- Only the Java standard library may be used
- No external storage may be used
- No global locks may be used
- Memory usage must remain bounded
- Old request data must be removable over time

## Metadata
- Programming Languages: Java
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
