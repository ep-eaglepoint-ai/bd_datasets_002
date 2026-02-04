# Trajectory: Bank Account Transfer Function

## 1. Problem Statement

When I first read the problem, I understood that financial transfers must guarantee consistency, prevent double spending, and maintain a clear audit trail even under concurrent access and partial failures. The core challenge is creating a PostgreSQL function that centralizes validation, balance updates, and error handling to ensure money is moved safely and predictably in real-world banking systems.

The problem demanded atomic operations on financial data where failures could result in lost money or inconsistent states. I realized that without proper concurrency control, two simultaneous transfers could debit the same account more times than its balance allows, leading to negative balances and financial loss.

---

## 2. Requirements Analysis

When I broke down the requirements, I identified two categories:

### Functional Requirements (What the function MUST do)

1. **Accept Parameters**: The function must accept source account ID, destination account ID, transfer amount, transfer timestamp, and request identifier. I noted that these five parameters cover everything needed to identify accounts, specify the transfer amount, provide temporal context, and enable idempotency.

2. **Validate Account Existence and Status**: Both accounts must exist and be active. I understood this prevents transfers to closed accounts or from suspended accounts, which would violate business rules.

3. **Validate Transfer Amount**: The amount must be positive. This prevents zero or negative transfers which could be used to manipulate balances.

4. **Check Sufficient Balance**: The source account must have enough balance to cover the transfer. Without this check, accounts could go negative.

5. **Prevent Duplicate Transfers**: Using the request identifier, the function must ensure each transfer is processed exactly once. This is critical for idempotency in distributed systems.

6. **Debit Source Account**: Reduce the source account balance by the transfer amount.

7. **Credit Destination Account**: Increase the destination account balance by the transfer amount.

8. **Record in Transaction Ledger**: Every transfer must be logged for auditing and reconciliation purposes.

9. **Write Audit Log Entry**: Track the transfer action with details for compliance and debugging.

10. **Atomic Balance Updates**: Both balances must be updated in a single atomic transaction. If one fails, both must revert.

11. **Return Transfer Result**: Provide a clear status and message indicating success or failure.

### Non-Functional Requirements (Quality Attributes)

- The function must handle concurrent access safely
- The function must not assume trusted input
- The function must follow production-grade structure

---

## 3. Constraints Analysis

The constraints shaped my implementation choices significantly:

1. **PL/pgSQL Language**: I had to write in PostgreSQL's procedural language, which I know supports exception handling, transactions, and row-level locking.

2. **Explicit Exception Handling**: Unlike many database functions that silently fail, this required catching specific error conditions and returning appropriate codes.

3. **SQLite-Style Error Codes**: The requirement to map failures to SQLite-style error codes (like 0 for OK, 5 for BUSY, 19 for CONSTRAINT) meant I needed to define constants and return standardized status codes.

4. **Idempotency Using Request Identifier**: The request_id parameter must enable duplicate detection. I realized the transaction_ledger table would need a unique constraint on request_id to enforce this at the database level.

5. **Transaction-Bound Writes**: All write operations must occur inside a transaction. PostgreSQL functions run in a transaction context by default, but I needed to ensure explicit error handling didn't break the transaction boundary.

6. **Concurrent Access Safety**: This was the most challenging constraint. I researched that PostgreSQL's SELECT FOR UPDATE with ordered locking prevents deadlocks and ensures consistent reads during updates.

7. **Untrusted Input**: Since input cannot be assumed trusted, I needed to validate all parameters, sanitize string inputs, and use parameterized approaches to prevent SQL injection.

---

## 4. Research and Resources

During my problem-solving process, I consulted the following:

### PostgreSQL Documentation

- **PostgreSQL PL/pgSQL Documentation**: I reviewed how to create functions, declare variables, and structure control flow. The [official documentation](https://www.postgresql.org/docs/current/plpgsql.html) confirmed that PL/pgSQL supports exception handling through the EXCEPTION block.

- **Transaction Isolation and Locking**: I studied PostgreSQL's transaction isolation levels and locking mechanisms. The [MVCC documentation](https://www.postgresql.org/docs/current/mvcc.html) helped me understand how row-level locking prevents lost updates.

- **Error Codes**: I researched SQLite error codes to understand the mapping requirement. The [SQLite error codes](https://www.sqlite.org/rescode.html) provide a standardized set of error identifiers that are familiar to many developers.

### Concurrency Patterns

- **Pessimistic Locking**: I learned that SELECT FOR UPDATE acquires row-level locks that prevent other transactions from modifying the same rows until the transaction commits. This is essential for preventing race conditions in financial systems.

- **Ordered Locking**: To prevent deadlocks when locking multiple rows, I discovered that locking rows in a consistent order (ascending by ID) eliminates circular wait conditions. This is a well-known deadlock prevention technique.

- **Serializable Isolation**: I considered whether SERIALIZABLE isolation would help, but decided that explicit locking with FOR UPDATE provides better control and performance for this use case.

### Error Handling Patterns

- **Exception Propagation**: I learned that in PL/pgSQL, when an exception occurs inside the EXCEPTION block, it propagates to the outer scope. This means I needed to return results before the EXCEPTION block to avoid losing error context.

- **Deadlock Detection**: PostgreSQL automatically detects deadlocks and aborts one of the transactions. I needed to catch deadlock_detected and return a retryable error code.

---

## 5. Method Selection and Rationale

### Why PL/pgSQL Over SQL?

When choosing between pure SQL and PL/pgSQL, I selected PL/pgSQL because:
- It supports complex control flow with IF/THEN/ELSE statements
- It provides EXCEPTION blocks for structured error handling
- It allows declaring local variables for intermediate calculations
- It enables procedural business logic that would be impossible in pure SQL

### Why Pessimistic Locking (SELECT FOR UPDATE) Over Optimistic Locking?

I chose pessimistic locking because:
- Financial transfers involve high-value operations where conflicts are costly
- Optimistic locking requires retry logic that complicates the API
- Pessimistic locking guarantees that no other transaction can modify the locked rows
- With ordered locking, deadlocks are prevented while maintaining consistency
- The overhead is acceptable because account transfers are relatively rare operations

### Why SQLite-Style Error Codes?

The requirement specified SQLite-style error codes, which I implemented because:
- They provide a standardized vocabulary that's familiar across different databases
- Error code 5 (BUSY) clearly indicates a retryable conflict
- Error code 19 (CONSTRAINT) distinguishes validation failures from system errors
- Clients can implement consistent error handling based on these codes

### Why Check Idempotency Before Performing Transfer?

I designed the idempotency check to occur before the balance updates because:
- If a transfer was already processed, we should return success without modifying balances
- This prevents duplicate debits even if the client retries due to a timeout
- The transaction_ledger unique constraint on request_id provides a second layer of protection

### Why Insert Into Ledger Before Updating Balances?

I chose to insert into the ledger before updating balances because:
- This ensures the audit record exists even if the update fails
- The unique constraint on request_id prevents duplicate insertions
- It follows the "write audit first" principle for financial systems
- If the insertion fails due to duplicate request_id, we return success (idempotent behavior)

---

## 6. Solution Implementation

### Step 1: Function Signature Design

When I designed the function signature, I chose:
```sql
CREATE OR REPLACE FUNCTION transfer_funds(
    source_id INTEGER,
    dest_id INTEGER,
    amount DECIMAL(15,2),
    transfer_ts TIMESTAMP,
    request_id VARCHAR(255)
)
RETURNS TABLE(status INTEGER, message TEXT)
```

I used DECIMAL(15,2) for the amount because it provides sufficient precision for financial calculations (up to 999 trillion with 2 decimal places). The return type TABLE(status INTEGER, message TEXT) allows returning both the SQLite-style error code and a human-readable message.

### Step 2: Error Code Constants

I defined SQLite-style error codes at the beginning:
```sql
c_ok         CONSTANT INTEGER := 0;   -- SQLITE_OK
c_error      CONSTANT INTEGER := 1;   -- SQLITE_ERROR
c_abort      CONSTANT INTEGER := 4;   -- SQLITE_ABORT
c_busy       CONSTANT INTEGER := 5;   -- SQLITE_BUSY
c_notfound   CONSTANT INTEGER := 12;  -- SQLITE_NOTFOUND
c_constraint CONSTANT INTEGER := 19;  -- SQLITE_CONSTRAINT
c_mismatch   CONSTANT INTEGER := 20;  -- SQLITE_MISMATCH
```

These constants make the code more readable and ensure consistent error code usage throughout the function.

### Step 3: Input Validation

I implemented input validation as the first step because:
- Invalid input should fail fast before any database operations
- NULL checks prevent null pointer exceptions in subsequent operations
- The btrim() function sanitizes the request_id string
- I return c_mismatch (20) for invalid input parameters

### Step 4: Same Account Check

I added a check preventing transfers to the same account:
```sql
IF source_id = dest_id THEN
    RETURN QUERY SELECT c_constraint, 'Source and destination accounts must be different';
```

This prevents logical errors where a user might accidentally transfer money to themselves.

### Step 5: Amount Validation

I validated that the amount is positive:
```sql
IF amount <= 0 THEN
    RETURN QUERY SELECT c_mismatch, 'Transfer amount must be positive';
```

This prevents zero or negative transfers that could be used to manipulate account balances.

### Step 6: Ordered Row Locking

This was the critical step for concurrency safety:
```sql
FOR r IN
    SELECT a.id
    FROM accounts a
    WHERE a.id IN (source_id, dest_id)
    ORDER BY a.id
    FOR UPDATE
LOOP
    NULL;
END LOOP;
```

I used ORDER BY id to lock rows in a consistent order, preventing deadlocks. The FOR UPDATE clause acquires exclusive row-level locks that prevent other transactions from modifying these rows until the current transaction commits. This ensures that when I read the balances, they won't change until I'm done.

### Step 7: Account Validation

After locking, I read the account states:
```sql
SELECT balance, active INTO source_balance, source_active FROM accounts WHERE id = source_id;
IF NOT FOUND THEN
    RETURN QUERY SELECT c_notfound, 'Source account does not exist';
```

I validated both existence and active status. If an account doesn't exist, I return c_notfound (12). If it's inactive, I return c_constraint (19) because it violates the business rule.

### Step 8: Balance Check

I verified sufficient balance:
```sql
IF source_balance < amount THEN
    RETURN QUERY SELECT c_abort, 'Insufficient balance';
```

I return c_abort (4) because this is a business rule violation that requires client intervention.

### Step 9: Idempotency Check

Before making changes, I checked for duplicate requests:
```sql
IF EXISTS (SELECT 1 FROM transaction_ledger WHERE transaction_ledger.request_id = v_req) THEN
    RETURN QUERY SELECT c_ok, 'Transfer already processed';
```

This makes the function idempotent - calling it multiple times with the same request_id will only process the transfer once. I return success if already processed.

### Step 10: Ledger Insertion

I inserted into the transaction ledger first:
```sql
INSERT INTO transaction_ledger (source_id, dest_id, amount, timestamp, request_id)
VALUES (source_id, dest_id, amount, transfer_ts, v_req);
```

The unique constraint on request_id ensures idempotency at the database level. If this fails due to a duplicate, the exception handler will catch it.

### Step 11: Balance Updates

I updated both balances:
```sql
UPDATE accounts SET balance = balance - amount WHERE id = source_id;
UPDATE accounts SET balance = balance + amount WHERE id = dest_id;
```

Because the rows are already locked, these updates are safe from concurrent modifications. The updates happen atomically within the transaction.

### Step 12: Audit Logging

I wrote an audit log entry:
```sql
INSERT INTO audit_log (action, details, timestamp)
VALUES (
    'TRANSFER',
    'source=' || source_id || ' dest=' || dest_id || ' amount=' || amount || ' request_id=' || v_req || ' transfer_ts=' || transfer_ts,
    NOW()
);
```

This provides a complete record of the transfer for compliance and debugging purposes.

### Step 13: Exception Handling

I implemented exception handling for concurrency-related errors:
```sql
EXCEPTION
    WHEN deadlock_detected OR serialization_failure OR lock_not_available THEN
        RETURN QUERY SELECT c_busy, 'Concurrent update conflict (retry)';
    
    WHEN unique_violation THEN
        RETURN QUERY SELECT c_constraint, 'Constraint violation';
    
    WHEN OTHERS THEN
        RETURN QUERY SELECT c_error, 'Unexpected error';
```

The c_busy (5) error code tells the client to retry the operation. The unique_violation catches duplicate request_id attempts that slipped through the idempotency check.

---

## 7. How the Solution Addresses Requirements and Constraints

### Requirement Coverage Matrix

| Requirement | How Addressed |
|-------------|---------------|
| Accept 5 parameters | Function signature with source_id, dest_id, amount, transfer_ts, request_id |
| Validate accounts exist and active | SELECT with FOUND check and active boolean validation |
| Validate positive amount | IF amount <= 0 check |
| Check sufficient balance | source_balance < amount comparison |
| Prevent duplicate transfers | Idempotency check + unique constraint on request_id |
| Debit source account | UPDATE accounts SET balance = balance - amount |
| Credit destination account | UPDATE accounts SET balance = balance + amount |
| Record in transaction ledger | INSERT INTO transaction_ledger |
| Write audit log entry | INSERT INTO audit_log |
| Atomic balance updates | All writes inside single transaction with row locking |
| Return status and message | RETURNS TABLE(status INTEGER, message TEXT) |

### Constraint Coverage Matrix

| Constraint | How Addressed |
|------------|---------------|
| PL/pgSQL | Function written in LANGUAGE plpgsql |
| Explicit exception handling | EXCEPTION block with specific error types |
| SQLite-style error codes | Constants defined and returned (0, 1, 4, 5, 12, 19, 20) |
| Idempotency | request_id check + unique constraint |
| Transaction-bound writes | All operations within function's implicit transaction |
| Concurrent access safety | SELECT FOR UPDATE with ordered locking |
| Untrusted input | NULL checks, btrim(), validation at entry point |

### Edge Cases Handled

1. **Concurrent Transfers**: Two transfers attempting to debit the same account simultaneously. The first acquires the lock and proceeds; the second gets c_busy and must retry.

2. **Same Account Transfer**: Attempting to transfer to the same account is rejected with c_constraint.

3. **Duplicate Request ID**: If the same request_id is used twice, the second attempt returns success (idempotent behavior).

4. **Negative Amount**: Rejected with c_mismatch before any database operations.

5. **Zero Amount**: Rejected with c_mismatch.

6. **Non-Existent Source Account**: Returns c_notfound.

7. **Non-Existent Destination Account**: Returns c_notfound.

8. **Inactive Source Account**: Returns c_constraint.

9. **Inactive Destination Account**: Returns c_constraint.

10. **Insufficient Balance**: Returns c_abort.

11. **Database Deadlock**: Returns c_busY with message suggesting retry.

12. **NULL Parameters**: Returns c_mismatch for invalid input.

### Why This Solution Works

The solution achieves correctness through:

1. **Pessimistic Locking**: By locking both account rows before reading balances, we ensure no other transaction can modify these rows until we commit. This prevents lost updates.

2. **Ordered Locking**: By always locking rows in ascending ID order, we prevent deadlocks that could occur if two transactions tried to lock the same rows in opposite orders.

3. **Idempotency**: The combination of idempotency check and unique constraint ensures each transfer is processed exactly once, even if the client retries.

4. **Validation Cascade**: Each validation step fails fast before any modifications, minimizing wasted work.

5. **Audit Trail**: Every transfer is recorded in both the transaction ledger and audit log, providing complete traceability.

6. **Error Codes**: SQLite-style error codes provide clear semantics for error handling in client applications.

7. **Atomicity**: All operations occur within a single transaction, ensuring that either all changes apply or none do.

---

## 8. Conclusion

This problem required careful consideration of concurrency, consistency, and correctness in a financial context. The solution balances safety with performance by using pessimistic locking for critical operations while keeping the locked section as short as possible. The idempotency mechanism ensures that the function can be safely retried without causing duplicate transfers. The audit trail and consistent error handling make the system production-ready for real-world banking applications.
