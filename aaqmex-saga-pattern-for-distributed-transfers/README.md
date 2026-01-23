# AAQMEX -  Saga Pattern for Distributed Transfers

**Category:** sft

## Overview
- Task ID: AAQMEX
- Title:  Saga Pattern for Distributed Transfers
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: aaqmex-saga-pattern-for-distributed-transfers

## Requirements
- The server implementation must utilize the FastAPI framework to expose the required endpoints.
- The API must explicitly implement three distinct endpoints: /debit, /credit, and /compensate_debit.
- Every endpoint must enforce the presence of a transaction_id in the HTTP request headers; requests missing this header must be rejected.
- The server must maintain an in-memory data structure (such as a Set or Dictionary) to track the history of all processed transaction_id strings
- The /credit endpoint must include a fault injection mechanism using the random module to intentionally raise an HTTP 500 Internal Server Error approximately 30% of the time.
- The application must implement strict Idempotency Logic: before processing any balance change, the system must check if the incoming transaction_id has already been processed.
- If a duplicate transaction_id is detected, the API must immediately return a successful status code (200 OK) without performing any further modifications to the user balances
- The /debit endpoint must decrease the balance of the source user and strictly persist this change to the in-memory state.
- The /compensate_debit endpoint must function as the inverse of /debit, adding the exact amount back to the source user to reverse a failed transaction.
- The client must implement specific error handling to catch the HTTP 500 exceptions returned by the /credit endpoint.

## Metadata
- Programming Languages: Python(3.9+) preferrable,  ASGI (uvicorn),Framework(FastAPI), httpx
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
