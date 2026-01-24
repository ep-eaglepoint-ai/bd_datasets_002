# YX64KS - Subscription Management

**Category:** sft

## Overview
- Task ID: YX64KS
- Title: Subscription Management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: yx64ks-subscription-management

## Requirements
- Accept user ID, plan ID, start date, status, and request identifier as inputs.
- Verify that the referenced user exists.
- Verify that the referenced subscription plan exists and is active.
- Prevent duplicate operations using the request identifier.
- Create a new subscription or update an existing one as appropriate.
- Record all subscription changes in a history table.
- Log each subscription operation for auditing and debugging.
- Execute all writes within a transactional scope.
- Reject invalid subscription state transitions.
- Map all errors to SQLite-style error codes.
- Defensively handle malformed or unexpected input.
- Return a structured result describing the subscription outcome.

## Metadata
- Programming Languages: PostgreSQL
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
