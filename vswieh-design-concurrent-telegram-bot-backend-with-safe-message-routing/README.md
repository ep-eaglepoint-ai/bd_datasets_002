# VSWIEH - Design Concurrent Telegram Bot Backend with Safe Message Routing

**Category:** sft

## Overview
- Task ID: VSWIEH
- Title: Design Concurrent Telegram Bot Backend with Safe Message Routing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vswieh-design-concurrent-telegram-bot-backend-with-safe-message-routing

## Requirements
- Accept Telegram updates and preserve chat IDs
- Handle each update independently
- Ensure responses go to correct chat IDs
- Prevent shared or overwritten user state
- Maintain concurrency without blocking

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
