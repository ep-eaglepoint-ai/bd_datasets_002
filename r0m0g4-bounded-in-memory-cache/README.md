# R0M0G4 - Bounded In-Memory Cache

**Category:** sft

## Overview
- Task ID: R0M0G4
- Title: Bounded In-Memory Cache
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: r0m0g4-bounded-in-memory-cache

## Requirements
- The cache must never exceed its maximum capacity.
- Recently used entries must be preferred over older ones.
- Expired entries must never be returned.
- The solution must be thread-safe.
- Only the Java standard library may be used.
- Access and updates must be constant-time.
- No background cleanup threads are allowed.
- Built-in cache libraries must not be used.
- The design must avoid global locking.
- Capacity limits must be strictly enforced.
- Eviction behavior must be deterministic.
- Concurrent access must not corrupt cache state.

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
