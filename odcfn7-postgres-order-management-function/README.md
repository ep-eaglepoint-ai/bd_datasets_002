# ODCFN7 - Postgres Order Management Function

**Category:** sft

## Overview
- Task ID: ODCFN7
- Title: Postgres Order Management Function
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: odcfn7-postgres-order-management-function

## Requirements
- The function processes a customer order.
- The function accepts customer, product, quantity, timestamp, and request identifier as input.
- The function validates that the customer exists and is active.
- The function validates that the product exists and is available.
- The function checks that enough inventory is available.
- The function prevents duplicate order requests.
- The function calculates the total price of the order.
- The function creates a new order record.
- The function updates inventory after order creation.
- The function records the operation in an audit log.
- The function uses transactional logic to ensure consistency.
- The function handles errors using SQLite-style error codes.
- The function returns a clear success or failure result.
- The function handles invalid and edge-case inputs.
- The function follows production-quality coding practices.

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
