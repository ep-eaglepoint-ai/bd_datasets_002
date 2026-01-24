# 2LBQGU - Expense Splitter Prisma Query Performance Optimization

**Category:** sft

## Overview
- Task ID: 2LBQGU
- Title: Expense Splitter Prisma Query Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 2lbqgu-expense-splitter-prisma-query-performance-optimization

## Requirements
- Balance calculations for a group with 50 members and 10,000 expenses must complete within 2 seconds. Current implementation takes 15+ seconds and causes database connection timeouts.
- The number of database queries for balance calculation must not scale linearly with member count. A group with 50 members should not require 200+ individual aggregate queries.
- Total database queries per page load must be reduced from 200+ to under 20 queries while maintaining identical balance results.
- The group detail page must render within 3 seconds for maximum-size groups. Data fetching operations should not load all 10,000 expenses into memory at once.
- Memory usage during balance calculation must remain under 100MB regardless of expense count in the group.
- All optimizations must use Prisma ORM methods only. No raw SQL queries are permitted
- Settlement suggestions must produce identical transaction lists as the current implementation. The minimum settlement algorithm logic must not be modified.
- Balance values must remain cent-accurate. The same balance formula must be preserved: totalPaid - totalOwed - settlementsPaid + settlementsReceived.

## Metadata
- Programming Languages: Typescript
- Frameworks: Nextjs
- Libraries: (none)
- Databases: postgress
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
