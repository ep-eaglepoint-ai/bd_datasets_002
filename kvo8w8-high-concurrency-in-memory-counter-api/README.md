# KVO8W8 - High-Concurrency In-Memory Counter API

**Category:** sft

## Overview
- Task ID: KVO8W8
- Title: High-Concurrency In-Memory Counter API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kvo8w8-high-concurrency-in-memory-counter-api

## Requirements
- Counts must be correct even when multiple requests happen at the same time.
- Updates must never be lost.
- The API endpoints and response fields must remain unchanged.
- The controller must be stateless.
- No use of synchronized or AtomicInteger.
- No shared mutable in-memory state.
- The solution must scale across multiple application instances.

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
