# MCYPXY - PostgreSQL E-Commerce Analytics Query Optimization

**Category:** sft

## Overview
- Task ID: MCYPXY
- Title: PostgreSQL E-Commerce Analytics Query Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: mcypxy-postgresql-e-commerce-analytics-query-optimization

## Requirements
- The daily revenue trend query must aggregate order totals by day for the past 90 days and complete in under 2 seconds. The current query takes 28 seconds and performs a sequential scan on the 50 million row orders table.
- The top products by category query must return the top 10 products by revenue for each of the 50 categories in the past 30 days. The current query takes 45 seconds due to a correlated subquery that executes once per category.
- The customer cohort analysis query must group customers by their first purchase month and show retention rates for the following 12 months. The current query takes 60 seconds and creates a 4GB temporary table during execution.
- The inventory turnover query must calculate how many times each product's inventory was sold through in the past quarter. The current query joins orders, order_items, and inventory tables with no indexes on the join columns, causing nested loop joins on millions of rows.
- The customer lifetime value query must calculate total spend per customer and rank them by percentile. The current query uses a window function over 50 million rows without proper partitioning, causing memory exhaustion.
- The category performance comparison query must show month-over-month growth rates for each category. The current query uses multiple self-joins on the orders table, multiplying the row count exponentially.
- All optimizations must use only standard PostgreSQL 15 features. No extensions, no materialized views, no table partitioning, and no schema changes beyond adding indexes.
- The total storage for new indexes must not exceed 2GB. Each index decision must balance query performance against storage cost.
- Query results must be identical to the original queries. Optimizations must not change the business logic or filter conditions.
- Queries must not require more than 500MB of work_mem. Solutions that rely on increasing work_mem to gigabytes are not acceptable.

## Metadata
- Programming Languages: SQL
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
