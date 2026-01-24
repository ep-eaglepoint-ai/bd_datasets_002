# EFGC48 - idempotent-financial-transaction-ledger

**Category:** sft

## Overview
- Task ID: EFGC48
- Title: idempotent-financial-transaction-ledger
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: efgc48-idempotent-financial-transaction-ledger

## Requirements
- Implement an `IdempotencyStore` that records the status and result of every `idempotency_key` for 24 hours. Subsequent requests with the same key must return the original result without re-executing logic.
- Use a database transaction context manager to ensure that both balance updates (sender and receiver) either succeed together or fail together.
- Prevent race conditions using a 'SELECT FOR UPDATE' pattern or an atomic 'UPDATE ... SET balance = balance - amount WHERE balance >= amount' approach.
- Handle the case where a transaction is already 'IN_PROGRESS' for a given key: if a second request arrives with the same key while the first is still processing, return a 409 Conflict or a custom 'Processing' exception.
- Ensure the system gracefully handles database connection timeouts by rolling back any partial state changes.
- Testing: Use `unittest.mock` to simulate concurrent execution of 50 threads attempting to withdraw 10 units each from an account with only 100 units. Verify that the final balance is exactly 0 and that exactly 10 transaction records exist. Add a test for idempotency where a mocked 'network failure' occurs after the update, and the subsequent retry returns the original success message without a second deduction.

## Metadata
- Programming Languages: Python
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
