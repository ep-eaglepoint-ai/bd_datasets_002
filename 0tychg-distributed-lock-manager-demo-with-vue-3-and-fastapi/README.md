# 0TYCHG - Distributed Lock Manager Demo with Vue 3 and FastAPI

**Category:** sft

## Overview
- Task ID: 0TYCHG
- Title: Distributed Lock Manager Demo with Vue 3 and FastAPI
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0tychg-distributed-lock-manager-demo-with-vue-3-and-fastapi

## Requirements
- The system allows clients to acquire exclusive or shared locks on a named resource.
- Lock acquisition supports both blocking and non-blocking requests.
- Each lock is issued with a configurable TTL and expires automatically if not renewed.
- Clients can renew an active lock before its TTL expires.
- Only the current lock holder can successfully release its lock.
- The backend prevents multiple clients from holding conflicting locks simultaneously.
- Lock state is persisted in a database and survives API restarts.
- The system issues monotonically increasing fencing tokens per resource.
- Expired or force-released locks increment the fencing token.
- Lock acquisition requests are idempotent when using the same idempotency key.
- The API exposes an endpoint to query current lock status for a resource.
- Real-time lock state changes are pushed to clients via WebSockets.

## Metadata
- Programming Languages: Python, TypeScript
- Frameworks: Vue 3 , FastAPI
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
