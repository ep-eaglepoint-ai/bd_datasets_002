# RYWXIV - Legacy Monolith to Async Micro-Library Refactoring

**Category:** sft

## Overview
- Task ID: RYWXIV
- Title: Legacy Monolith to Async Micro-Library Refactoring
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rywxiv-legacy-monolith-to-async-micro-library-refactoring

## Requirements
- Tech Stack: Python 3.10+, asyncio, aiohttp, pydantic (or dataclasses)
- The solution must replace requests (synchronous) with aiohttp (asynchronous) and use asyncio.gather or asyncio.TaskGroup to process symbols in parallel.
- Global variables (sentiment_cache) must be removed. State must be encapsulated within a class instance
- The function signature def get_sentiment(ticker, data_points=[]) is a classic Python trap. The refactor must remove this mutable default argument to prevent data leakage between function calls.
- The bare except: block must be replaced with specific exception handling (ClientError, JSONDecodeError), and failures must be logged properly rather than returning 0 silently (or returning a defined None / Result type)
- The solution must use type hints (-> float, list[str]) throughout

## Metadata
- Programming Languages: Python 3.10+
- Frameworks: pure python
- Libraries: asyncio,aiohttp,pydantic
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
