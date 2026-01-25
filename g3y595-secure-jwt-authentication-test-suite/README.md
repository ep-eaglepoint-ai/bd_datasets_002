# G3Y595 - Secure JWT Authentication Test Suite

**Category:** sft

## Overview
- Task ID: G3Y595
- Title: Secure JWT Authentication Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g3y595-secure-jwt-authentication-test-suite

## Requirements
- Test Token Reuse Detection with Family Revocation
- Test Successful Login Updates User State
- Test Failed Login Shows Error
- Test Logout Clears Tokens and User State
- Test Form Validation
- Test Unauthenticated Access Redirects to Login
- Test Authenticated Access to Dashboard
- Test LoginForm Displays Demo Credentials
- Test Dashboard Shows User Info and Logout Button
- Test Error Messages Display Correctly

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: React, Jest
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
