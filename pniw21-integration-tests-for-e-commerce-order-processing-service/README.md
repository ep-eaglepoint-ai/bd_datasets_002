# PNIW21 - Integration Tests for E-Commerce Order Processing Service

**Category:** sft

## Overview
- Task ID: PNIW21
- Title: Integration Tests for E-Commerce Order Processing Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pniw21-integration-tests-for-e-commerce-order-processing-service

## Requirements
- Each test must run in complete isolation from other tests. Use PostgreSQL transactions that begin before each test and rollback after, ensuring no test data persists between runs. Verify isolation by running the full test suite twice consecutively—the second run must produce identical results. Tests must be executable in any order without affecting outcomes, confirmed by running with Jest's --randomize flag.
- Redis stores temporary inventory reservations with TTL. Each test must start with a clean Redis state by flushing the test database (use a dedicated Redis DB number like 15 for tests). Verify cleanup by checking that reservation keys from a previous test do not exist when the next test begins. Never use the production Redis database for tests.
- Mock the Stripe SDK entirely using Jest mocks. The mock must intercept paymentIntents.create, paymentIntents.search, refunds.create, and webhooks.constructEvent. Verify no real Stripe calls occur by checking that process.env.STRIPE_SECRET_KEY is never accessed during test execution. Mock responses must include realistic Stripe object structures (id, status, amount, metadata).
- Test the complete order creation flow including: (a) successful order with valid inventory and payment, (b) failure when requested quantity exceeds available inventory, (c) failure when payment is declined, (d) multi-item orders from different products. Each test must verify the final order status in the database, the inventory quantity change, and whether the idempotency key was stored in Redis. Verify payment mock was called with correct amount in cents.
- Test race conditions where multiple orders attempt to purchase the last available inventory simultaneously. Use Promise.allSettled to execute 2-3 concurrent order requests for inventory that can only fulfill one. Verify exactly one order succeeds with status paid, others fail with inventory error, and final inventory count equals zero. This test must pass consistently 10 consecutive times without flakiness.
- Test the three-phase inventory lifecycle: (a) reservation decreases available quantity and creates Redis key, (b) confirmation on successful payment permanently decreases database inventory and clears reservation, (c) release on payment failure restores available quantity. Verify by checking both Redis reservation keys and PostgreSQL inventory table at each phase. Test partial reservation release for multi-item orders where one item fails.
- Test that inventory reservations expire after the configured timeout (typically 15 minutes). Since Jest fake timers do not affect Redis server TTL, verify TTL is set correctly using redis.ttl() command (should return value close to 900 seconds). Optionally, use a very short TTL (1-2 seconds) in a specific test and actually wait for expiration to verify behavior. Document that production TTL cannot be directly tested with fake timers.
- Test that submitting the same order request twice with identical idempotency key returns the same order without creating a duplicate charge. Verify the Stripe mock's paymentIntents.create is called exactly once across both requests. Test that failed orders also cache their idempotency key, returning the failed order on retry rather than re-attempting payment.
- Test full and partial refund flows: (a) full refund of all items restores complete inventory and sets order status to refunded, (b) partial refund of some items restores only those quantities and keeps order status as paid, (c) refund creates a record in the refunds table with correct amount. Verify Stripe refund mock is called with correct payment intent ID and amount. Test rejection of refunds for unpaid orders and refunds exceeding ordered quantity.
- Test Stripe webhook handling: (a) valid signature passes verification and updates order status, (b) invalid signature returns HTTP 401, (c) duplicate webhook with same event ID is acknowledged but not reprocessed (check Redis for event ID storage). Test out-of-order webhooks where payment_intent.succeeded arrives after payment_intent.payment_failed—the final order status should reflect the chronologically latest event based on event timestamp, not arrival order.

## Metadata
- Programming Languages: TypeScript
- Frameworks: (none)
- Libraries: (none)
- Databases: Postgress , redis
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
