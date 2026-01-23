# VZVMT4 - URL shortening service

**Category:** sft

## Overview
- Task ID: VZVMT4
- Title: URL shortening service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vzvmt4-url-shortening-service

## Requirements
- Accept a long URL and generate a unique short code (e.g., aBc12)
- Redirect users from short URLs to their original destinations using proper HTTP semantics
- Provide a minimal web UI to create and view shortened URLs
- Validate URLs to prevent malformed or invalid entries
- Ensure idempotency: the same long URL always returns the same short code
- Character set: [a-zA-Z0-9]
- Length: 5–8 characters
- Must not rely solely on UUIDs or cryptographic randomness

## Metadata
- Programming Languages: JavaScript, TypeScript, Go , Python
- Frameworks: React
- Libraries: (none)
- Databases: PostgreSQL
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
