# 4CX94M - User Session Analytics API

**Category:** sft

## Overview
- Task ID: 4CX94M
- Title: User Session Analytics API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4cx94m-user-session-analytics-api

## Requirements
- The API endpoint path, HTTP method, and response fields must remain unchanged
- Session duration must be calculated as endTime minus startTime
- Sessions with an endTime earlier than startTime must be rejected
- The algorithm must run in O(n) time using a single pass over the data
- The controller must be stateless and thread-safe
- Validation must use Bean Validation and be declarative
- Validation logic must be separate from aggregation logic
- The API must return stable and explicit error responses
- No shared mutable state may be introduced
- The solution must be suitable for horizontal scaling

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
