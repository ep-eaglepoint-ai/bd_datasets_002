# 5H7XOP - Order Processing Pipeline Code Refactoring

**Category:** sft

## Overview
- Task ID: 5H7XOP
- Title: Order Processing Pipeline Code Refactoring
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5h7xop-order-processing-pipeline-code-refactoring

## Requirements
- Refactor all methods so that no single method exceeds 20 lines of executable code. Extract helper methods where necessary to maintain readability and single responsibility.
- Ensure no method has a cyclomatic complexity greater than 5. Flatten nested conditionals using early returns, guard clauses, or by extracting decision logic into separate methods or classes.
- Design the payment processing architecture so that adding a new payment provider (e.g., ApplePay, GooglePay) requires creating exactly one new Java file that implements a payment interface. No modifications to existing files should be necessary.
- Consolidate all discount calculation logic into a single location. The refactored code must produce penny-for-penny identical discount amounts as the original code for all scenarios including coupon discounts, premium customer discounts, and bulk order discounts.
- Implement a state machine that validates all order status transitions. The valid states are PENDING, VALIDATED, PRICED, RESERVED, PAID, PENDING_PAYMENT, PAYMENT_FAILED, FULFILLED, and CANCELLED. Any attempt to transition to an invalid state must throw an IllegalStateException with a descriptive message.
- Restructure the OrderProcessor class to accept its dependencies (database client, inventory service, payment gateway) through constructor injection. This must allow the class to be instantiated in unit tests using mock implementations without requiring live database connections or external service calls.
- Identify and eliminate duplicate code blocks throughout the OrderProcessor. Consolidate repeated patterns for database queries, HTTP requests, validation logic, and error handling. Target at least 80% reduction in duplicated code.
- The solution must use only Java 17 standard library features. No external dependencies such as Spring, Guava, Apache Commons, or Lombok are permitted. Leverage Java 17 features like records, sealed classes, and pattern matching where appropriate.
- All code changes must be confined to the order-service module. Do not modify code in other modules, shared libraries, or common utilities outside this module.
- The existing OrderProcessorIntegrationTest.java test suite must pass without modification after refactoring. The default constructor behavior must be preserved to maintain backward compatibility with these tests.
- Do not alter the database schema. All SQL queries must remain compatible with the existing tables (orders, order_items, customers, coupons) and their current column definitions.
- The refactored code must preserve 100% of the original order processing behavior. All existing workflows, edge cases, error handling paths, and business rules must function identically to the original implementation.

## Metadata
- Programming Languages: Java
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
