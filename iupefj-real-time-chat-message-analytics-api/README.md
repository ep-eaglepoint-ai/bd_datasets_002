# IUPEFJ - Real-Time Chat Message Analytics API

**Category:** sft

## Overview
- Task ID: IUPEFJ
- Title: Real-Time Chat Message Analytics API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: iupefj-real-time-chat-message-analytics-api

## Requirements
- Compute per-user message count, average message length, and longest message from the request payload only.
- Ensure analytics are independent per request and do not use shared mutable state.
- Preserve the existing response format and field names.
- Handle empty, null, or partially invalid input without failing the request.
- Exclude invalid messages from analytics calculations.
- Select the longest message deterministically when lengths are equal.
- Scale linearly with the number of input messages.
- Avoid redundant loops and unnecessary repeated computations.
- Remain safe and correct under concurrent requests.
- Follow standard Spring Boot and Java best practices with clear, maintainable code.

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
