# WM08ZF - FastAPI bank accounts module

**Category:** sft

## Overview
- Task ID: WM08ZF
- Title: FastAPI bank accounts module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wm08zf-fastapi-bank-accounts-module

## Requirements
- Identify and clearly explain all architectural, logical, and performance bugs in the existing implementation.
- Refactor the system so that the FastAPI request lifecycle is never blocked by background work.
- Refactor the system so that external task queues (Celery/Redis) are used correctly and asynchronously.
- Refactor the system so that email sending is fully decoupled from account creation logic.
- Introduce proper error handling, retries, and failure isolation for background tasks.
- Ensure database operations remain atomic and are not affected by email delivery failures.
- Improve code structure by enforcing separation of concerns between API layer, service layer, and background task execution.
- Optimize performance and scalability for high-concurrency scenarios.
- Maintain authentication and authorization guarantees tied to the current user.

## Metadata
- Programming Languages: Python
- Frameworks: FastAPI
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
