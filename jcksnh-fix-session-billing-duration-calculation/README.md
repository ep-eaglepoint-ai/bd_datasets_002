# JCKSNH - Fix Session Billing Duration Calculation

**Category:** sft

## Overview
- Task ID: JCKSNH
- Title: Fix Session Billing Duration Calculation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jcksnh-fix-session-billing-duration-calculation

## Requirements
- Session is billable only if duration > 0
- Include sessions exactly at window start/end
- Clip overlapping sessions to the window
- Prevent negative durations
- Maintain function signatures and return types

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
