# UGGD5V - Password Reset

**Category:** sft

## Overview
- Task ID: UGGD5V
- Title: Password Reset
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: uggd5v-password-reset

## Requirements
- The function accepts user ID, reset token, expiration timestamp, and request identifier.
- The function validates that the user exists and is active.
- The function invalidates any existing active reset tokens for the user.
- The function prevents duplicate reset requests using the request identifier.
- The function stores the new reset token with an expiration time.
- The function logs the reset request.
- The function uses transactional logic.
- The function handles invalid users and expired tokens.
- The function reports errors using SQLite-style error codes.
- The function returns a reset initiation result.

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
