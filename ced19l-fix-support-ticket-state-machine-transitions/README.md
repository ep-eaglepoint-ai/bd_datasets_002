# CED19L - Fix Support Ticket State Machine Transitions

**Category:** sft

## Overview
- Task ID: CED19L
- Title: Fix Support Ticket State Machine Transitions
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ced19l-fix-support-ticket-state-machine-transitions

## Requirements
- Enforce allowed transitions only
- Maintain ticket history order
- Preserve function signatures and return types
- Correct logic without adding new data structures

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
