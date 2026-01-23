# HKI5BG - Dependency Cycle Detector

**Category:** sft

## Overview
- Task ID: HKI5BG
- Title: Dependency Cycle Detector
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hki5bg-dependency-cycle-detector

## Requirements
- Circular dependencies must be detected.
- Disconnected dependency graphs must be handled correctly.
- A task depending on itself must be treated as a cycle.
- The solution must scale efficiently to large numbers of tasks and dependencies.
- Time complexity must be linear in the number of tasks and dependencies.
- Additional memory usage must be linear.
- Brute-force path enumeration must not be used.
- Adjacency matrix representations must not be used.
- All cyclic configurations must be rejected.
- All acyclic configurations must be accepted.

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
