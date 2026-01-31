# K0TUZ5 - Distributed Reservation System with Exponential Backoff

**Category:** sft

## Overview
- Task ID: K0TUZ5
- Title: Distributed Reservation System with Exponential Backoff
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k0tuz5-distributed-reservation-system-with-exponential-backoff

## Requirements
- Must NOT use external libraries (Gin, Echo, etc.).
- Must use sync.Mutex or sync.RWMutex to prevent concurrent map writes (Race Condition).
- Must return HTTP 409 (Conflict) if stock is insufficient.
- Must return HTTP 429 if the rate limit is exceeded (simulated count is fine).
- Must spawn multiple concurrent goroutines (simulating high load).
- Must implement Exponential Backoff on retries (not just time.Sleep(fixed_amount))
- Must include Jitter (randomization) in the wait time to prevent synchronized retries.
- Client must handle connection errors (e.g., if server is down) without panicking.
- Client must ensure resp.Body.Close() is called to prevent file descriptor leaks.

## Metadata
- Programming Languages: Go (Golang 1.18+)
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
