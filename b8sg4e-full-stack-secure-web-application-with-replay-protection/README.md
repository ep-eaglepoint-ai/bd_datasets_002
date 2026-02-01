# B8SG4E - Full-Stack Secure Web Application with Replay Protection

**Category:** sft

## Overview
- Task ID: B8SG4E
- Title: Full-Stack Secure Web Application with Replay Protection
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: b8sg4e-full-stack-secure-web-application-with-replay-protection

## Requirements
- Generate cryptographically secure nonce (UUID) and timestamp expiry on the frontend.
- Sign all sensitive API requests using HMAC-SHA256 or JWT.
- Backend must verify request signature and timestamp window.
- Store used nonces in MongoDB with TTL to auto-expire.
- Reject expired, invalid, or reused requests with proper HTTP status codes.
- Implement JWT-based user authentication with refresh tokens.
- Role-based access control for protected routes.
- Rate limiting per user/IP to prevent abuse.
- Logging and monitoring of API requests and replay attempts.
- Enable CORS configuration and enforce HTTPS.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Next.js
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
