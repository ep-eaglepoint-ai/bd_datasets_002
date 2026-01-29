# YTB49Z - Comprehensive Concurrency-Safe Testing of Order Fulfillment Handler in Go

**Category:** sft

## Overview
- Task ID: YTB49Z
- Title: Comprehensive Concurrency-Safe Testing of Order Fulfillment Handler in Go
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ytb49z-comprehensive-concurrency-safe-testing-of-order-fulfillment-handler-in-go

## Requirements
- The test suite must verify that concurrent orders for the same product do not oversell inventory beyond initial stock.
- The system must correctly reject duplicate order IDs and leave inventory unchanged.
- The tests must cover and assert rejection of orders with insufficient stock.
- The suite must validate that high-amount orders (>10000) are declined without modifying inventory.
- The tests must ensure negative or zero quantities are rejected with appropriate errors.
- The final order status must be correctly set to "shipped" only after successful processing.
- Inventory must be restored or unchanged on any failure path (rollback semantics).
- The suite must include at least one concurrency test using multiple goroutines accessing shared inventory.

## Metadata
- Programming Languages: Go 1.2
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
