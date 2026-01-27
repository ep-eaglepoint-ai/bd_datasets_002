# Trajectory: Bank Account Transfer

## 1. Problem Statement

I started by carefully reading the problem statement. The task was to write a PostgreSQL function that transfers funds between two bank accounts, ensuring consistency, preventing double spending, and maintaining an audit trail under concurrent access and partial failures. The function needed to centralize validation, balance updates, and error handling for safe money movement in banking systems.

## 2. Requirements

I listed out all the requirements the function must meet:
- Accept source account ID, destination account ID, transfer amount, transfer timestamp, and request identifier
- Validate both accounts exist and are active
- Validate transfer amount is positive
- Check source account has sufficient balance
- Prevent duplicate transfers using request identifier
- Debit source account balance
- Credit destination account balance
- Record transfer in transaction ledger
- Write audit log entry
- Ensure atomic balance updates
- Return transfer result with status and message

## 3. Constraints

I noted the key constraints that shaped the implementation:
- Written in PL/pgSQL
- Use explicit exception handling
- Map failures to SQLite-style error codes (numeric codes like 0 for success, 1 for errors)
- Idempotent using request identifier
- All write operations in transaction
- Handle concurrent access safely
- No trusted input assumption
- Production-grade structure

## 4. Research

I researched PostgreSQL functions and best practices. I looked into:
- PostgreSQL documentation on PL/pgSQL: https://www.postgresql.org/docs/current/plpgsql.html
- Transaction handling in PostgreSQL: https://www.postgresql.org/docs/current/tutorial-transactions.html
- Row-level locking for concurrency: https://www.postgresql.org/docs/current/explicit-locking.html
- Idempotency patterns in database functions
- SQLite error codes reference: https://www.sqlite.org/rescode.html

I also checked Stack Overflow for common patterns in bank transfer implementations and error handling in PL/pgSQL.

## 5. Choosing Methods

I chose PL/pgSQL because it was explicitly required and well-suited for database functions with complex logic.

For concurrency, I chose SELECT ... FOR UPDATE with ORDER BY id to prevent deadlocks, as this is a standard pattern in PostgreSQL for safe concurrent access.

For idempotency, I initially tried a check-then-insert pattern, but found it wasn't concurrency-safe. I then switched to using INSERT with exception handling for unique violations on the request_id, which ensures atomicity and safety under concurrent access.

For error handling, I used explicit EXCEPTION blocks and returned numeric status codes (0 for success, 1 for errors) with descriptive messages.

I chose to return a table with status and message instead of raising exceptions, to allow the caller to handle the result programmatically.

For input validation, I added checks for NULL and invalid values since the constraint specified "no trusted input assumption".

## 6. Solution Implementation

I started by creating the database schema with three tables: accounts, transaction_ledger, audit_log.

Then, I implemented the transfer_funds function with the following logic:

First, I added input validation to check for NULL or invalid parameters.

Then, I checked for same account transfer.

Then, I locked the accounts in order using SELECT ... FOR UPDATE to prevent deadlocks.

Then, I validated accounts exist and are active.

Then, validated amount > 0.

Then, checked balance >= amount.

Then, I attempted to record in ledger with INSERT, catching unique_violation exceptions for idempotency.

If the insert succeeds, I proceeded with balance updates and audit logging.

If unique_violation occurs, I returned success (already processed).

All operations are wrapped in exception handling, returning error status for any failures.

I used RETURNS TABLE(status INTEGER, message TEXT) and RETURN QUERY SELECT for the results.

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

The solution handles all requirements: accepts all parameters, validates everything, updates balances atomically, records in ledger and audit, returns result with numeric status and message.

For constraints:
- PL/pgSQL: yes
- Explicit exception handling: yes, with BEGIN EXCEPTION END blocks
- Error codes: returns numeric SQLite-style codes (0 for OK, 1 for errors)
- Idempotent: uses unique constraint on request_id with exception handling
- Transaction: all writes in implicit transaction
- Concurrent: uses FOR UPDATE with ordering and atomic insert
- No trusted input: validates all inputs including NULL checks
- Production-grade: proper structure, error handling, comments

Edge cases handled:
- Same account: error
- Non-existent accounts: error
- Inactive accounts: error
- Negative/zero amount: error
- Insufficient balance: error
- Duplicate request_id: success (idempotent)
- Concurrent transfers: safely handled with locking and unique constraints
- Database errors: caught and returned as errors
- NULL inputs: validated and rejected

The implementation is robust and handles all scenarios while maintaining data consistency and safety.
