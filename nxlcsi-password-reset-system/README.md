# NXLCSI - Password Reset System

**Category:** sft

## Overview
- Task ID: NXLCSI
- Title: Password Reset System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nxlcsi-password-reset-system

## Requirements
- The system must maintain correctness under concurrent access such that repeated stress tests with overlapping reset requests and confirmations produce zero information leakage and zero state corruption.
- All logs produced by the system must exclude sensitive data such as tokens, passwords, or indicators of account validity.
- Email delivery must be simulated asynchronously and must include a reset link, expiration notice, and security warning without confirming whether the recipient account exists.
- The frontend must include loading states, accessible form controls, keyboard navigation, and mobile responsiveness without leaking security-relevant state.
- The token must be removed from the browser URL after submission to reduce exposure through browser history or screen sharing.
- Client-side password validation must enforce a minimum length of twelve characters with at least one uppercase letter, one lowercase letter, one number, and one special character.
- The reset password page must extract the token from the URL query string, perform only superficial client-side validation, and rely entirely on the backend for authoritative validation.
- The frontend must never display any UI state that reveals whether an account exists and must always present a generic success message after reset requests.
- Password updates must use strong password hashing (bcrypt or argon2) and must invalidate all active sessions for the user upon success.
- The backend must expose asynchronous FastAPI endpoints for both requesting and confirming password resets and must avoid any blocking operations in the request lifecycle.
- Rate limiting must enforce a maximum of three password reset requests per email per fifteen-minute window without revealing enforcement behavior through timing or messaging.
- For emails that do not exist in the system, the backend must perform dummy work that approximates the timing characteristics of real processing to prevent account enumeration.
- Token consumption must be atomic under concurrency such that no race condition can allow double use or inconsistent state.
- A password reset token must be usable exactly once, and when multiple concurrent requests attempt to redeem the same token, at most one request may successfully update the password.
- All failure cases during password reset confirmation (expired, invalid, already used, nonexistent token, weak password) must produce indistinguishable client-facing responses.
- Token validation must use constant-time comparison such that execution timing does not vary between valid and invalid tokens.
- Plaintext reset tokens must never be stored in memory persistence or logs, and only a SHA-256 hash of each token may be persisted.
- Token generation must provide at least 256 bits of entropy and must be cryptographically unpredictable under all usage scenarios.
- All password reset request responses must be identical in status code, body, headers, and observable timing characteristics regardless of whether the submitted email corresponds to a real account.

## Metadata
- Programming Languages: Javascript, Python
- Frameworks: React
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
