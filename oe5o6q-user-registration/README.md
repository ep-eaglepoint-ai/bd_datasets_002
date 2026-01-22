# OE5O6Q - User Registration

**Category:** sft

## Overview
- Task ID: OE5O6Q
- Title: User Registration
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: oe5o6q-user-registration

## Requirements
- The function must accept email, password hash, full name, registration timestamp, and a request identifier.
- The function must validate that all required inputs are present and properly formatted.
- The function must prevent duplicate email registrations.
- The function must be idempotent using the request identifier.
- The function must insert a new user record and a related user profile record.
- The function must record every registration attempt in an audit log.
- The function must ensure all database writes are atomic and transactional.
- The function must handle concurrent requests safely.
- The function must handle common failures such as invalid input and duplicates.
- The function must map errors to SQLite-style error codes.
- The function must return a consistent structured result indicating success or failure.

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
