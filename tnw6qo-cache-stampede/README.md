# TNW6QO - Cache Stampede

**Category:** sft

## Overview
- Task ID: TNW6QO
- Title: Cache Stampede
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tnw6qo-cache-stampede

## Requirements
- The expensive computation must run only once per key.
- Concurrent callers must wait and receive the same result.
- Failures must be propagated consistently to all callers.
- Different keys must not block each other.
- The solution must support high concurrency.
- Failure must not trigger repeated computation.
- Internal state must be cleaned up after completion.
- The solution must not use busy waiting.
- The solution must not use background threads or thread pools.
- The solution must not rely on global synchronization.
- Only the Java standard library may be used.

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
