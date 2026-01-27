# G7E3M6 - TypeScript Unit Tests for Payment Processing Module

**Category:** sft

## Overview
- Task ID: G7E3M6
- Title: TypeScript Unit Tests for Payment Processing Module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g7e3m6-typescript-unit-tests-for-payment-processing-module

## Requirements
- Mock all Stripe SDK methods including paymentIntents.create, paymentIntents.retrieve, refunds.create, subscriptions.create, subscriptions.update, subscriptions.cancel, and webhooks.constructEvent.
- Mock all PayPal API calls using fetch mocking to simulate token acquisition, order creation, and payment capture responses.
- Write success scenario tests for each public method in PaymentService, RefundService, SubscriptionService, WebhookHandler, and PayPalClient.
- Test amount validation errors including amount less than or equal to zero, amount exceeding maximum allowed, and missing required fields.
- Test Stripe-specific error handling including StripeCardError (declined cards), StripeInvalidRequestError, and network timeout errors.
- Test PayPal-specific error handling including authentication failures (invalid client credentials), capture failures, and network errors.
- Test idempotency key behavior ensuring duplicate payment requests with same idempotency key return cached result instead of creating new charge.
- Test Stripe's built-in idempotency handling by verifying idempotency key is passed correctly to Stripe API calls.
- Test partial refund scenarios including refunding a portion of the original charge amount and verifying remaining balance.
- Test full refund scenarios including refunding the entire charge amount and verifying charge status updates.
- Test refund validation errors including attempting to refund more than available amount and attempting to refund an already fully refunded charge.
- Test subscription creation with trial period ensuring trial days are correctly applied and billing starts after trial ends.
- Test subscription plan change (upgrade/downgrade) ensuring proration is handled correctly.
- Test subscription cancellation with immediate effect versus cancellation at end of billing period
- Test webhook signature verification with valid signature, invalid signature, and expired timestamp scenarios.
- Test duplicate webhook event handling ensuring the same event ID is not processed twice.
- Test event dispatch ensuring correct handler is called for each webhook event type (payment_intent.succeeded, invoice.payment_failed, etc.).
- Test failed payment retry logic ensuring attempt counter increments on each failure and subscription is cancelled after maximum retry attempts.
- Mock Date.now() in all tests that depend on timestamps to ensure deterministic behavior.
- Ensure each test is independent with no shared state between tests using beforeEach to reset mocks and test data.
- Create separate test files for each service: payment-service.test.ts, refund-service.test.ts, subscription-service.test.ts, webhook-handler.test.ts, paypal-client.test.ts.
- Use descriptive test names following the pattern: "should [expected behavior] when [condition]".
- Achieve 90%+ code coverage on branches, functions, lines, and statements.
- Ensure all tests complete in under 10 seconds total.
- Verify tests are not flaky by running the test suite 5 times consecutively without any failures.

## Metadata
- Programming Languages: Typescript
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
