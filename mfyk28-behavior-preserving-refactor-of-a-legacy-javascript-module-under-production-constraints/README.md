# MFYK28 - Behavior-Preserving Refactor of a Legacy JavaScript Module Under Production Constraints

**Category:** sft

## Overview
- Task ID: MFYK28
- Title: Behavior-Preserving Refactor of a Legacy JavaScript Module Under Production Constraints
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: mfyk28-behavior-preserving-refactor-of-a-legacy-javascript-module-under-production-constraints

## Requirements
- Refactor the provided JavaScript module while preserving its public API exactly.
- All exported functions, function signatures, return values, and error behaviors must remain unchanged.
- All existing tests must continue to pass without modification.

## Metadata
- Programming Languages: Java Script
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
