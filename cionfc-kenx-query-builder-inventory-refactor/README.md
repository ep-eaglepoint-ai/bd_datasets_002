# CIONFC - kenx_query_builder_inventory_refactor

**Category:** sft

## Overview
- Task ID: CIONFC
- Title: kenx_query_builder_inventory_refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: cionfc-kenx-query-builder-inventory-refactor

## Requirements
- Eliminate all raw SQL template literals; the final implementation must use 100% Knex query builder syntax.
- Preserve the complex join logic across the 'products', 'categories', and 'order_items' tables as defined in the provided schema.
- Implement the 'stock_status' dynamic filter using Knex's conditional query building (.where or .andWhere), replacing the manual string concatenation logic.
- Convert the nested subquery used for 'total_sold' into a Knex subquery or a join-aggregate pattern that yields exactly the same result.
- Maintain strict TypeScript types for both the input filters and the returned report objects.
- Implement safe pagination logic (limit/offset) using the Knex builder API, including validation to ensure limits do not exceed 100.
- Ensure the refactored code correctly handles the 'Category' association using a Left Join to include products without categories.
- Define a clear interface for the Knex configuration and ensure the service handles potential database connection errors during query execution.
- Provide testing instructions that verify the generated SQL structure and parameter binding using a mock Knex instance (e.g., using 'mock-knex').

## Metadata
- Programming Languages: TypeScript
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
