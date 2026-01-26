# PR6I0M - Sliding Window Rate Limiting

**Category:** sft

## Overview
- Task ID: PR6I0M
- Title: Sliding Window Rate Limiting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pr6i0m-sliding-window-rate-limiting

## Requirements
- Each client must be rate-limited independently.
- The rate limit must be enforced using a sliding time window.
- Requests outside the time window must not be counted.
- The solution must be safe under concurrent requests.
- The system must support a large number of clients.
- Only the Java standard library may be used.
- The design must avoid global locks.
- The solution must not rely on sleep-based timing.
- No external systems or dependencies may be used.
- Memory usage must remain bounded over time.
- Valid requests must not be incorrectly rejected.
- Concurrency must not allow rate-limit violations.

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
