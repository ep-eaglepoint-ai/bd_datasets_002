# 3LK5O1 - Order Fulfillment & Warehouse Management System (Full-Stack)

**Category:** sft

## Overview
- Task ID: 3LK5O1
- Title: Order Fulfillment & Warehouse Management System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3lk5o1-order-fulfillment-warehouse-management-system-full-stack

## Requirements
- 1. Product Management List all products with: Name SKU (unique) Available quantity View product details and stock history Products cannot have negative stock
- 2. Order Management Create new customer orders Orders include: Customer information One or more products with quantities Initial order state: pending Orders progress through: pending → packed → shipped → delivered canceled (from pending or packed only)
- 3. Inventory Reservation When an order is created: Inventory is reserved immediately Reserved inventory is unavailable to other orders Canceling an order releases reserved inventory
- 4. Shipment Processing Orders marked as shipped deduct inventory permanently Shipping actions must be idempotent Shipped orders cannot be modified
- 5. Order History View order history by customer Display order status, items, and timestamps History is read-only
- 6. Authentication & Authorization Email/password authentication JWT-based authentication Warehouse staff can: Update order status Support agents have read-only access

## Metadata
- Programming Languages: Javascript, Typescript, CSS
- Frameworks: React (Vite), Nodejs, Express and Tailwind css
- Libraries: (none)
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

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
