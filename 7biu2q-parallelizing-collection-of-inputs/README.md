# 7BIU2Q - parallelizing-collection-of-inputs

**Category:** sft

## Overview
- Task ID: 7BIU2Q
- Title: parallelizing-collection-of-inputs
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7biu2q-parallelizing-collection-of-inputs

## Requirements
- The code must limit the number of concurrent processes to prevent CPU and memory oversubscription.
- The implementation must efficiently utilize available CPU cores without spawning one process per task
- Process creation and teardown overhead must be minimized to reduce total execution time
- Work must be scheduled so that all CPU cores remain busy when tasks are available
- Total execution time must scale predictably as the size of regressList increases.

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
