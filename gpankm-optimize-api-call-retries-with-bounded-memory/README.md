# GPANKM - Optimize_API_Call_Retries_with_Bounded_Memory

**Category:** rl

## Overview
- Task ID: GPANKM
- Title: Optimize_API_Call_Retries_with_Bounded_Memory
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gpankm-optimize-api-call-retries-with-bounded-memory

## Requirements
- Bounded Logging: Use a fixed-size array (size=3) for APILogData history per call.
- xponential Backoff: Add jitter (10-20%) to avoid thundering herd.
- Verification: Include benchmark for 1000 calls with 30% failures in <10s.

## Metadata
- Programming Languages: - JavaScript, - TypeScript
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
