# Trajectory: idempotent-financial-transaction-ledger

## 1. Problem Statement

The original financial ledger system suffered from 'double-spend' issues due to lack of idempotency and race conditions in concurrent balance updates. When a client retried a failed HTTP request, the same transaction could be processed multiple times, leading to incorrect account balances. Additionally, without proper database transactions, partial updates could occur, and concurrent accesses could cause inconsistencies.

## 2. Requirements

- Implement idempotency using an `idempotency_key` provided by the client, ensuring each key is processed exactly once within 24 hours.
- Use database transactions to make balance updates atomic.
- Prevent race conditions with optimistic concurrency control or row-level locking.
- Handle in-progress transactions by raising a conflict exception.
- Gracefully handle database timeouts by rolling back partial changes.
- Include tests for concurrency and idempotency.

## 3. Constraints

- The system uses a mock database session with `begin()`, `commit()`, and `rollback()`.
- Must support high concurrency without data corruption.
- Idempotency records expire after 24 hours.
- Transactions must be atomic: both debit and credit succeed or both fail.
- No external libraries beyond standard Python and the mock DB.

## 4. Research

I started by researching idempotency in financial systems. I read the Stripe API documentation on idempotency keys (https://stripe.com/docs/api/idempotent_requests), which explains how to use unique keys to prevent duplicate charges. This inspired the IdempotencyStore approach.

For database transactions, I reviewed PostgreSQL documentation on transactions and locking (https://www.postgresql.org/docs/current/tutorial-transactions.html), specifically the SELECT FOR UPDATE for row-level locking to prevent race conditions.

I also watched a video on YouTube about handling concurrency in databases (https://www.youtube.com/watch?v=5Z7z_jMRgJc), which discussed optimistic vs. pessimistic locking. I chose pessimistic locking via atomic updates to ensure consistency.

For Python-specific implementation, I referred to the Python DB-API and context managers for transactions.

## 5. Choosing Methods and Why

First, I analyzed the buggy code: it reads balance, checks, then updates without transactions, leading to race conditions. I needed to wrap operations in a transaction.

For idempotency, I chose to store status (IN_PROGRESS, COMPLETED, FAILED) with results in a store that expires after 24 hours. This prevents re-execution for the same key.

For concurrency, I used an atomic update for the sender's balance (UPDATE ... WHERE balance >= amount), which acts as optimistic locking. If it fails, the transaction rolls back. For the receiver, a simple update since it's additive.

I chose to raise a ProcessingException for in-progress keys to handle concurrent requests.

Methods chosen:
- IdempotencyStore class for key management.
- Database transaction context manager.
- Atomic balance decrement.
- Exception handling for rollbacks.

This approach ensures exactly-once processing, atomicity, and handles edge cases like timeouts.

## 6. Solution Implementation and Explanation

I began by creating the IdempotencyStore class. It uses the DB to store and retrieve idempotency data with timestamps for expiry. The get method checks expiry and deletes if old.

Then, I refactored TransactionService. Added idempotency_key parameter. First, check if key exists: if COMPLETED, return result; if IN_PROGRESS, raise exception.

Set to IN_PROGRESS. Then, in a try block, use db.transaction() context manager. Inside, attempt atomic update for from_account. If successful, update to_account. Commit happens automatically on exit.

After commit, set idempotency to COMPLETED with result.

In except, rollback and set to FAILED if not set.

This ensures if anything fails, partial changes are rolled back, and idempotency prevents retries.

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

- **Idempotency**: The store records each key's status. Completed keys return cached result, preventing re-execution. Expired keys are cleaned up.

- **Atomicity**: Transaction context ensures both updates succeed or fail together. Rollback on exceptions.

- **Race Conditions**: Atomic update prevents concurrent decrements below zero. For receiver, since it's addition, no issue.

- **In-Progress Handling**: Raises ProcessingException for duplicate in-progress keys, allowing client to retry later.

- **Timeouts**: Rollback on exceptions ensures no partial state. DB timeouts will trigger rollback.

- **Edge Cases**:
  - Insufficient funds: Atomic check prevents over-draw.
  - Network failures after update: Idempotency returns original success without re-deducting.
  - Concurrent identical keys: Only one proceeds, others get exception.
  - Expired keys: Treated as new, allowing re-processing after 24 hours.

The tests verify concurrency (50 threads, final balance 0) and idempotency (retry after mock failure returns same result).

