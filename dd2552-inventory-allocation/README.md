# DD2552 - Inventory Allocation

**Category:** sft

## Overview
- Task ID: DD2552
- Title: Inventory Allocation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dd2552-inventory-allocation

## Requirements
- Reduce the number of queries executed per order.
- Avoid per-item SELECT and UPDATE patterns.
- Ensure inventory is updated only if all items are available.
- Minimize lock duration on inventory rows.
- Prevent partial inventory updates.
- Preserve exact allocation behavior.
- Improve performance for large orders.
- Maintain clear business logic.
- Remove unnecessary notices.
- Ensure consistent results under concurrency.
- Function signature must remain unchanged.
- No schema or index changes allowed.
- No temporary tables allowed.
- The function must remain in PL/pgSQL.
- Assume high concurrency and large orders.
- The optimized function must be safe for production.

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
