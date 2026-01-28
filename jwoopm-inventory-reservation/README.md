# JWOOPM - Inventory Reservation
 ### Run tests (after – expected all pass)
```bash
docker compose run --rm tests
 ```

**Expected behavior:**
 -PL/pgSQL function tests: ✅ PASS (implementation complete)

#### Run evaluation (compares both implementations)
```bash
docker compose run --rm evaluation 
``` 

**Category:** sft

## Overview
- Task ID: JWOOPM
- Title: Inventory Reservation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jwoopm-inventory-reservation

## Requirements
- The function accepts product ID, reservation quantity, expiration timestamp, and request identifier.
- The function validates that the product exists and is active.
- The function checks that sufficient inventory is available.
- The function prevents duplicate reservations using the request identifier.
- The function creates an inventory reservation record.
- The function updates available inventory quantities.
- The function logs the reservation action.
- The function handles insufficient stock and invalid input errors.
- The function maps errors to SQLite-style error codes.
- The function returns a reservation status result.

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
