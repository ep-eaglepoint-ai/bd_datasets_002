# WGADH9 - Hidden Quadratic Time Behavior in Discount Accumulation Logic

**Category:** sft

## Overview
- Task ID: WGADH9
- Title: Hidden Quadratic Time Behavior in Discount Accumulation Logic
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wgadh9-hidden-quadratic-time-behavior-in-discount-accumulation-logic

## Requirements
- Algorithmic Constraint: Worst-case time complexity must be O(n + m).
- Resource Constraint: Memory usage must scale linearly without excessive intermediate allocations.
- Acceptance Criteria: The refactor must be safe under adversarial distributions (e.g., many discounts for a single route).

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
