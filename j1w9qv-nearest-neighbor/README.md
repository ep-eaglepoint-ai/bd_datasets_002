# J1W9QV - nearest neighbor

**Category:** sft

## Overview
- Task ID: J1W9QV
- Title: nearest neighbor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: j1w9qv-nearest-neighbor

## Requirements
- Median selection during tree construction must not exceed O(n) time complexity per level
- Minimize memory allocations during tree construction; avoid creating unnecessary intermediate data structures or copies
- Avoid redundant computations values that remain constant across recursive calls must not be recomputed
- The implementation must handle high-dimensional data (k > 10) without significant performance degradation
- All distance calculations must avoid unnecessary mathematical operations (e.g., no square roots when squared distances suffice)
- Nearest neighbor search must implement effective branch pruning to skip subtrees that cannot contain closer points
- The implementation must be free of dead code, unused imports, and redundant conditional checks

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
