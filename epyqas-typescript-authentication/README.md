# EPYQAS - typescript-authentication

**Category:** sft

## Overview
- Task ID: EPYQAS
- Title: typescript-authentication
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: epyqas-typescript-authentication

## Requirements
- Must use nextjs and typescript
- Auth must be implemented from scratch (NO EXTERNAL LIBRARY ALLOWED)
- Only support email, username and password (Make email and username interchable - can use email instead of username to sign in)
- Handle session creation, persistence and validation
- Handling clearing sessions
- Implement password Hashing and verification MANUALLY

## Metadata
- Programming Languages: TypeScript
- Frameworks: NextJS
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
