# ZWIO6E - Football Season Stats Service

**Category:** sft

## Overview
- Task ID: ZWIO6E
- Title: Football Season Stats Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zwio6e-football-season-stats-service

## Requirements
- The public API endpoint path and request parameters must remain unchanged.
- The JSON response schema must not introduce breaking changes.
- All blocking operations must be removed from the request execution path.
- Aggregation logic must execute in linear time.
- Sorting must be efficient and free of side effects.
- The solution must be thread-safe and scalable under concurrent load.
- Code must follow clean architecture and SOLID principles.
- Responsibilities must be clearly separated between controller, service, and data logic.
- Unnecessary object creation and inefficient access patterns must be avoided.
- The endpoint must consistently respond within acceptable latency under normal load.

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
