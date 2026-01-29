# KR0UDZ - Adversarial Test Harness for Permission Harmonization Logic

**Category:** sft

## Overview
- Task ID: KR0UDZ
- Title: Adversarial Test Harness for Permission Harmonization Logic
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kr0udz-adversarial-test-harness-for-permission-harmonization-logic

## Requirements
- Generate update inputs that exercise authority conflicts, refinements-before-parents, duplicates, and late-arriving lower-authority updates
- Implement a test harness that calls an existing harmonize_permissions(vault, updates) function without modifying it
- Verify logical invariants using the engine’s report, audit trail, and final state, without replaying or recomputing the full harmonization logic

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
