# 8E74OB - nexus-Warehouse-Database-Optimizer

**Category:** sft

## Overview
- Task ID: 8E74OB
- Title: nexus-Warehouse-Database-Optimizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8e74ob-nexus-warehouse-database-optimizer

## Requirements
- Schema Level Optimization: Add a B-Tree index to the 'sku' column within the Pallet model definition and ensure the index has a specific, identifiable name for DBA auditing. This modification should transform SKU-based lookups from an $O(N)$ Sequential Scan to an $O(\\log N)$ Index Scan.
- Safe Data Retrieval (Pagination): Refactor the zone listing function to accept 'limit' and 'offset' parameters to prevent the service from loading tens of thousands of rows into the application heap at once. This must ensure the application remains stable and within its memory overhead limits regardless of the total record count per zone.
- Paginated Response Architecture: Modify the return structure to provide a metadata object containing 'total_count', 'limit', and 'offset' alongside the actual data list. This allows consumers to build navigation interfaces without needing to calculate the total dataset size via secondary manual queries.
- Database Execution Verification: Implement a validation routine using the `EXPLAIN` keyword in SQL to programmatically verify that the query engine is using the newly created index for the SKU lookup. The system should identify the 'Index Scan' marker in the output string as proof of the performance fix.
- Stress Boundary Handling: Define logic for extreme input values, such as an 'offset' larger than the 'total_count', which should return an empty result set and valid metadata instead of a SQL error or exception. Ensure that negative or zero values for limit default to a safe system-defined maximum.
- Benchmarking Implementation: Write a comparative test suite that measures the execution time of 5,000 randomized lookups using a simulated SQLite or local PostgreSQL instance. The suite must assert that the p99 latency for SKU-based retrieval is significantly reduced compared to the unindexed baseline version.
- Integration Constraint Verification: Test the memory footprint of the `list_pallets_in_zone` function by mocking a 50,000-row response. The test must fail if the peak memory usage during execution suggests the entire result set was buffered synchronously rather than fetched according to the limit parameters.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: SQLAlchemy, Alembic, psycopg2
- Databases: PostgreSQL
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
- Database migrations: `alembic init alembic` (first time), then `alembic revision --autogenerate -m "Initial migration"`, `alembic upgrade head`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
