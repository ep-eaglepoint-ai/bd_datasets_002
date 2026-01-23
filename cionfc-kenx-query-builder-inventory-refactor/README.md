# CIONFC - kenx_query_builder_inventory_refactor

**Category:** sft

## Overview
- Task ID: CIONFC
- Title: kenx_query_builder_inventory_refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: cionfc-kenx-query-builder-inventory-refactor

## Requirements
- Eliminate all raw SQL template literals; implementation uses 100% Knex query builder syntax.
- Preserve complex join logic across 'products', 'categories', and 'order_items' tables.
- Implement 'stock_status' dynamic filters using Knex's conditional query building.
- Convert nested subqueries for 'total_sold' into Knex subquery builders.
- Maintain strict TypeScript types for filters and report objects.
- Implement safe pagination (limit/offset) with 100-row validation.
- Handle nullable categories using Left Joins.
- Verify SQL structure and parameter binding using `mock-knex`.

## Metadata
- Programming Languages: TypeScript, Node.js
- Frameworks: Knex.js
- Libraries: Jest, mock-knex
- Databases: PostgreSQL
- Tools: Docker, npm
- Best Practices: Parameterized Queries, Type Safety, Clean Code
- Performance Metrics: O(limit) pagination

## Structure
- repository_before/: baseline code (legacy raw SQL)
- repository_after/: optimized code (Knex.js builder)
- tests/: comprehensive test suite
- evaluation/: comparison and report generation scripts
- trajectory/: implementation notes and walkthrough

## Quick start
- Run tests locally: `npm test`
- Run evaluation: `npx ts-node evaluation/evaluation.ts`
- With Docker: `docker compose up --build`

## Docker Commands

### Build image
```bash
docker compose build
```

### Run tests (before – expected some failures)
```bash
docker compose run --rm test-before
```

### Run tests (after – expected all passes)
```bash
docker compose run --rm test-after
```

### Run evaluation
```bash
docker compose run --rm evaluation
```

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
- All tests are verified to pass in `repository_after`.
