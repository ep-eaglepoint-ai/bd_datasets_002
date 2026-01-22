# RT9X1V - Payment Processing

**Category:** sft

## Overview
- Task ID: RT9X1V
- Title: Payment Processing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rt9x1v-payment-processing

## Requirements
- The function must accept order ID, payment amount, payment method, payment timestamp, and request identifier.
- The function must verify that the order exists.
- The function must verify that the order has not already been paid.
- The function must verify that the payment amount matches the order total.
- The function must prevent duplicate processing using the request identifier.
- The function must insert a payment record.
- The function must update the order status to paid.
- The function must write a payment audit log entry.
- The function must ensure all operations are atomic.
- The function must handle missing orders and duplicate payments safely.
- The function must return a structured result with status and message.

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
