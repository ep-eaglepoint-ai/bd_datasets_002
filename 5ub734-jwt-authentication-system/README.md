# 5UB734 - JWT Authentication System

**Category:** sft

## Overview
- Task ID: 5UB734
- Title: JWT Authentication System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5ub734-jwt-authentication-system

## Requirements
- Implement a full JWT authentication flow using access tokens + refresh tokens
- Access tokens must be short-lived and Include user_id, role, and a session_id in the payload
- Refresh tokens must be stored in a secure, HTTP-only cookie
- Refresh tokens must Be tracked in the database for rotation and theft detection
- Implement refresh token rotation every refresh invalidates the old token
- If a previously-used refresh token is detected treat as potential theft
- If a previously-used refresh token is detected invalidate all tokens in the same session family
- Hash refresh tokens before persistence using bcrypt (cost factor ≥ 12)
- Implement authentication middleware that validates access tokens
- Build a secure login form with email and password inputs
- Build a secure login form with Client-side validation
- Prevent infinite refresh loops when the refresh token is invalid
- Store access tokens in memory only
- Automatically log out users when refresh token expires or when refresh token is revoked

## Metadata
- Programming Languages: TypeScript, JavaScript,
- Frameworks: React, Express
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
