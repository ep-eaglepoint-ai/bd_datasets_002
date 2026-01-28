# 9A9PCC - order processing refactor

**Category:** rl

## Overview
- Task ID: 9A9PCC
- Title: order processing refactor
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9a9pcc-order-processing-refactor

## Requirements
- The discount calculation currently uses deeply nested if-else statements checking customer tier, order total, and promotional codes. Refactor to use a `DiscountStrategy` interface with implementations like `TierBasedDiscount`, `VolumeDiscount`, `PromoCodeDiscount`. The `OrderProcessor` should accept a list of strategies and apply them in sequence or use the best one.
- The shipping cost calculation appears in multiple places with slight variations. Extract into a `ShippingCalculator` class with a single `calculate(order, destination)` method. Similarly, the tax calculation logic should be in a `TaxCalculator` class. Both should be injected into the `OrderProcessor`.
- Replace raw float/int for money with a `Money` class that handles currency, prevents floating point errors (use Decimal internally), and provides arithmetic operations. Replace raw strings for status with an `OrderStatus` enum. Replace the address dictionary with an `Address` dataclass with validation.
- Replace generic `Exception` and `ValueError` raises with custom exceptions: `InsufficientInventoryError`, `InvalidOrderError`, `PaymentFailedError`, `ShippingNotAvailableError`. Each should include relevant context (order ID, product ID, amount, etc.). Use early returns and guard clauses to reduce nesting in error checks.
- The refactored `OrderProcessor` must expose the same public methods and accept the same parameter formats as the original. For any valid input, it must return exactly the same results (order totals, discounts, etc.) as the original code.
- The system must correctly apply the best (highest) discount from all available strategies, including combinations of customer tiers and promo codes, and yield the same final price as the original. Tests should cover all combinations (each tier, all promo codes, thresholds, etc.).
- The `ShippingCalculator` should produce the same shipping costs for all countries, weights, and free-shipping scenarios as before. Tests must include boundaries (e.g., weights at threshold, free shipping triggers, unsupported countries).
- The refactoring must not alter how taxes are calculated for various states/countries. The `TaxCalculator` should be tested for all possible state/country inputs and return consistent tax rates and rounding as the original code.
- All monetary operations (add, subtract, compare, round) must be tested. Results must be correctly rounded and free from floating-point errors. Conversions between Money and primitives should be explicit and tested.
- Invalid addresses (e.g., missing fields, invalid country/state) must raise exceptions. Invalid order statuses must be rejected. Tests should cover all valid/invalid status transitions and address edge cases.
- Each custom error must provide the documented message and include contextual data (like product ID, order ID). Unit tests must assert that the correct exception type and message is raised for each failure mode.
- Placing an order deducts inventory, and invalid orders do not mutate inventory. If inventory is insufficient, an `InsufficientInventoryError` is raised and stock levels are unchanged. Tests must cover concurrent/serial orders for the same product.
- OrderProcessor`/repository instances must not share or leak state between tests. The test suite should prove isolation by running parallel tests that do not interfere (e.g., via clean in-memory state per test).
- For any given input sequence (including edge and error cases), all observable side effects and return values from the refactored code must match those of the original code exactly.
- Tests must ensure that orders with missing customer info, items, shipping address, or with invalid product IDs, zero/negative quantities, or non-existent promo codes fail with the correct error and leave state unchanged.
- All public classes, methods, and value objects introduced must include docstrings and type hints suitable for static analysis and user-facing reference documentation.
- Order timestamps produced by the refactored code must appear in the same format and with the same semantics as the original (e.g., ISO format at time of order). Test for predictability and correctness if mocked.

## Metadata
- Programming Languages: Python
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
