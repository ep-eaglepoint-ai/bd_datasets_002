# Trajectory: Idempotent Financial Transaction Ledger

## 1. Problem Statement

I started by analyzing the original `TransactionService` implementation and identified three critical bugs:

1. **No Idempotency Check**: The original `transfer_funds` method had no mechanism to prevent duplicate processing. When a client retries a failed HTTP request, the same transaction could be executed multiple times, causing "double-spend" issues where the same balance gets decremented twice.

2. **No Transaction Atomicity**: The original code performed two separate `update_balance` calls without wrapping them in a database transaction. If the second update failed after the first succeeded, the system would end up in an inconsistent state (money deducted from sender but never credited to receiver).

3. **Race Condition**: The original implementation read the balance first (`self.db.get_balance(from_account)`), then performed updates. Between the read and write operations, another thread could modify the same account's balance, leading to inconsistent or incorrect balance calculations.

The goal was to ensure that every transaction is processed exactly once per idempotency key and that account balances remain consistent under high concurrent load.

---

## 2. Requirements

From the task description, I identified the following requirements that the solution must meet:

1. **Idempotency Store**: Implement an `IdempotencyStore` that records the status and result of every `idempotency_key` for 24 hours. Subsequent requests with the same key must return the original result without re-executing logic.

2. **Atomic Transactions**: Use a database transaction context manager to ensure that both balance updates (sender and receiver) either succeed together or fail together.

3. **Concurrency Control**: Prevent race conditions using either a 'SELECT FOR UPDATE' pattern or an atomic 'UPDATE ... SET balance = balance - amount WHERE balance >= amount' approach.

4. **In-Progress Handling**: Handle the case where a transaction is already 'IN_PROGRESS' for a given key. If a second request arrives with the same key while the first is still processing, return a 409 Conflict or a custom 'Processing' exception.

5. **Graceful Error Handling**: Ensure the system handles database connection timeouts by rolling back any partial state changes.

6. **Testing**: Use `unittest.mock` to simulate concurrent execution of 50 threads attempting to withdraw 10 units each from an account with only 100 units. Verify that the final balance is exactly 0 and that exactly 10 transaction records exist. Add a test for idempotency where a mocked 'network failure' occurs after the update, and the subsequent retry returns the original success message without a second deduction.

---

## 3. Constraints

From the task description, I identified the following constraints:

1. **Language**: The solution must be implemented in Python.

2. **Database**: The system uses PostgreSQL concepts (though a mock database is provided for testing).

3. **Mock Database Interface**: The system uses a mock database session that supports `begin()`, `commit()`, and `rollback()` methods.

4. **Thread Safety**: The solution must be thread-safe since multiple concurrent requests may arrive simultaneously.

5. **Time-to-Live (TTL)**: The idempotency store must automatically clean up entries after 24 hours.

6. **No External Dependencies**: The solution should be implementable using standard Python libraries without adding heavy external dependencies.

---

## 4. Research

Before implementing the solution, I researched the following concepts and resources:

### 4.1 Idempotency in Distributed Systems

I read about idempotency patterns in distributed systems:
- **Idempotency Keys**: The concept of using client-provided idempotency keys to ensure safe retries. This is a common pattern used by payment APIs like Stripe and PayPal.
  - [Stripe API Documentation - Idempotency](https://stripe.com/docs/api/idempotency)
  - [REST API Design - Idempotency](https://restfulapi.net/idempotent-rest-requests/)

### 4.2 Database Transactions and ACID Properties

I reviewed database transaction concepts:
- **Atomicity**: All operations in a transaction succeed or none do.
- **Consistency**: Database remains in a valid state before and after transactions.
- **Isolation**: Concurrent transactions don't interfere with each other.
- **Durability**: Committed transactions are permanent.
  - [PostgreSQL Transaction Documentation](https://www.postgresql.org/docs/current/tutorial-transactions.html)

### 4.3 Concurrency Control Patterns

I researched two main approaches for preventing race conditions:

1. **Pessimistic Locking (SELECT FOR UPDATE)**: Lock rows during read to prevent other transactions from modifying them.
   - [PostgreSQL SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)

2. **Optimistic Locking with Atomic Updates**: Perform updates atomically by including the condition in the UPDATE statement itself.
   - [Optimistic Concurrency Control Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/optimistic-concurrency)

### 4.4 Python Context Managers for Transactions

I reviewed Python's context manager pattern for database transactions:
- [Python Context Managers](https://docs.python.org/3/library/contextlib.html)

---

## 5. Choosing Methods and Why

After research, I made the following architectural decisions:

### 5.1 Idempotency Store Implementation

I chose to implement an **in-memory thread-safe idempotency store** because:

1. **Simplicity**: For this implementation, an in-memory store is sufficient and avoids the complexity of setting up an external cache like Redis.

2. **Thread Safety**: I used `threading.Lock()` to ensure thread-safe access to the shared store dictionary.

3. **TTL Cleanup**: I implemented automatic cleanup of expired entries (24 hours) to prevent memory leaks.

4. **Status Tracking**: The store tracks three states:
   - `IN_PROGRESS`: Transaction is being processed
   - `COMPLETED`: Transaction succeeded (result cached)
   - `FAILED`: Transaction failed (can be retried)

### 5.2 Concurrency Control Approach

I chose the **atomic UPDATE approach** with per-account locking because:

1. **Atomicity**: The `update_balance_atomic` method checks the balance and updates it in a single atomic operation with per-account locking.

2. **Efficiency**: This approach is more efficient than pessimistic locking since it doesn't hold locks for extended periods.

3. **Simplicity**: The atomic update pattern `WHERE balance >= amount` naturally handles the balance check and update in one operation.

### 5.3 Transaction Context Manager

I used Python's `@contextmanager` decorator to create a transaction context manager because:

1. **Clean Syntax**: The `with self.db.transaction():` syntax is clean and Pythonic.

2. **Exception Safety**: The context manager automatically handles rollback on exceptions.

3. **Resource Management**: The transaction lock is properly acquired and released.

### 5.4 In-Progress Conflict Handling

I decided to raise a `ProcessingException` when a duplicate request arrives for an in-progress transaction because:

1. **Clear Semantics**: This makes it explicit that the request cannot be processed immediately.

2. **Client Guidance**: Clients can retry after a delay or wait for the original request to complete.

3. **HTTP 409 Alignment**: This maps well to HTTP 409 Conflict status code in a real API.

---

## 6. Solution Implementation and Explanation

### 6.1 IdempotencyStore Implementation

I implemented the `IdempotencyStore` class with the following design:

```python
class IdempotencyStore:
    """Thread-safe in-memory idempotency store with TTL."""

    TTL_SECONDS = 24 * 60 * 60  # 24 hours

    def __init__(self):
        self.store = {}  # key -> (status, result, timestamp)
        self.lock = threading.Lock()
```

I chose a dictionary-based storage for O(1) access time. Each entry stores a tuple of (status, result, timestamp) with the timestamp used for TTL cleanup.

### 6.2 MockDatabase with Transaction Support

I implemented the `MockDatabase` class with:

1. **Transaction Context Manager**: The `transaction()` context manager handles begin/commit/rollback automatically.

2. **Per-Account Locks**: Each account has its own lock to allow concurrent updates to different accounts.

3. **Pending Changes Buffer**: During a transaction, changes are buffered and only applied on commit.

4. **Atomic Balance Updates**: The `update_balance_atomic` method performs the balance check and update in one atomic operation.

### 6.3 TransactionService Implementation

I refactored the `TransactionService` to:

1. **Accept Idempotency Key**: The `transfer_funds` method now requires an `idempotency_key` parameter.

2. **Check Idempotency First**: Before processing, I check if the key already exists in the store.

3. **Set IN_PROGRESS**: I mark the transaction as in-progress to prevent concurrent processing.

4. **Execute in Transaction**: All balance updates and recording happen within the transaction context.

5. **Handle Completion**: On success, I mark the transaction as COMPLETED with the result.

6. **Handle Failures**: On failure, I check if the transaction was actually committed (by checking if a record exists) and mark accordingly.

---

## 7. How Solution Handles Requirements, Constraints, and Edge Cases

### 7.1 Handling Idempotency (Requirement 1)

The solution handles idempotency through:

1. **Idempotency Store Check**: Every request first checks the store for an existing entry.

2. **Cached Result**: For COMPLETED requests, the cached result is returned immediately without re-executing logic.

3. **Failed State**: For FAILED requests, the transaction can be retried with the same key.

### 7.2 Handling Atomicity (Requirement 2)

The solution ensures atomicity through:

1. **Transaction Context Manager**: Both balance updates are wrapped in `with self.db.transaction():`.

2. **Rollback on Exception**: If any operation fails, the entire transaction is rolled back.

3. **Pending Changes Buffer**: Changes are only visible within the transaction and are atomically applied on commit.

### 7.3 Handling Concurrency (Requirement 3)

The solution prevents race conditions through:

1. **Per-Account Locks**: Each account has its own lock to prevent concurrent modifications.

2. **Atomic Updates**: The `update_balance_atomic` method checks the balance and updates it atomically.

3. **Transaction Lock**: A global transaction lock prevents concurrent transactions from interfering.

### 7.4 Handling In-Progress Conflicts (Requirement 4)

The solution handles in-progress conflicts by:

1. **IN_PROGRESS State**: When a transaction starts, it's marked as IN_PROGRESS.

2. **Conflict Detection**: If another request arrives with the same key, it detects the IN_PROGRESS state.

3. **ProcessingException**: The second request raises a `ProcessingException` indicating the conflict.

### 7.5 Handling Graceful Error Recovery (Requirement 5)

The solution handles errors gracefully through:

1. **Exception Handling**: All exceptions are caught and handled appropriately.

2. **Transaction Rollback**: Partial state changes are rolled back on errors.

3. **Record-Based Recovery**: If a transaction is committed but the status update fails, the next retry detects the committed record and marks the transaction as COMPLETED.

### 7.6 Handling Testing (Requirement 6)

The solution supports the required testing through:

1. **Thread-Safe Design**: The solution supports concurrent execution of 50 threads.

2. **Atomic Operations**: Only exactly 10 transactions can succeed when withdrawing 10 units from a 100-unit account.

3. **Network Failure Recovery**: The solution detects committed records even when network failures occur after the update.

### 7.7 Edge Cases Handled

I identified and handled the following edge cases:

1. **Network Failure After Commit**: If the transaction commits but the response fails to send, the next retry detects the record and returns the cached result.

2. **Concurrent Requests with Same Key**: The idempotency store uses a lock to prevent race conditions in the store itself.

3. **Insufficient Funds**: The atomic update naturally fails if the balance is insufficient, and the transaction is rolled back.

4. **Account Does Not Exist**: The system handles non-existent accounts by treating them as having zero balance.

5. **TTL Expiration**: Expired entries are automatically cleaned up to prevent memory leaks.

6. **Duplicate Requests During Processing**: When a second request arrives while the first is still processing, a ProcessingException is raised.

---

## Summary

I approached this problem systematically by:

1. **Analyzing the original buggy implementation** to understand the root causes of the issues.

2. **Researching industry best practices** for idempotency, atomic transactions, and concurrency control.

3. **Designing a solution** that addresses all requirements while working within the constraints of the mock database.

4. **Implementing the solution** with careful attention to thread safety and error handling.

5. **Verifying edge cases** to ensure the solution is robust and handles all expected failure scenarios.

The final solution provides a thread-safe, idempotent, and atomic financial transaction ledger that prevents double-spend issues and maintains data consistency under high concurrency.
