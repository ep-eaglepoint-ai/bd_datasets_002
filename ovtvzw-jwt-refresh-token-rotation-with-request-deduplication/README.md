# OVTVZW - JWT Refresh Token Rotation with Request Deduplication

**Category:** sft

## Overview
- Task ID: OVTVZW
- Title: JWT Refresh Token Rotation with Request Deduplication
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ovtvzw-jwt-refresh-token-rotation-with-request-deduplication

## Requirements
- Must use native fetch (No Axios/libs).
- Server must simulate rapid token expiration (approx 3s) to guarantee client-side failures.
- Wrapper must detect HTTP 401 status.
- Must implement a logic lock (e.g., isRefreshing boolean) or Singleton Promise to prevent multiple simultaneous calls to /api/refresh.
- Failed requests must be stored in a queue/array while the refresh is pending.
- Upon successful refresh, all queued requests must be re-executed with the new token.
- If the refresh fails, all queued requests must reject (fail) gracefully.
- The consuming component must not know a refresh occurred; the Promise should eventually resolve with the requested data.

## Metadata
- Programming Languages: Node js , Vue 3
- Frameworks: Express
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
