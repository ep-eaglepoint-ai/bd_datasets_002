# Trajectory: User Registration Function Implementation

## Project Overview

Implementation of a production-grade PostgreSQL stored procedure for user registration with enterprise-level safety guarantees including input validation, idempotency, atomic transactions, audit logging, and concurrency safety.

---

## 1. Problem Analysis

**Initial State**: Empty implementation in `repository_before/`

**Requirements**:

1. Correct registration results (user + profile creation)
2. Performance on large datasets (100+ registrations < 10s)
3. Safe concurrent execution (race condition handling)
4. Appropriate error codes (SQLite-style: 0=OK, 19=CONSTRAINT, 21=MISUSE)
5. Invalid input handling (NULL, empty, malformed email)
6. Deterministic behavior (email normalization, trimming, audit logs)
7. PostgreSQL best practices (atomic transactions, proper types)
8. Unchanged function signature

**Core Challenges**:

- Idempotency: Same request_id must return same result
- Concurrency: Multiple simultaneous registrations with same email
- Data integrity: User + profile must be created atomically
- Audit trail: All attempts (success/failure) must be logged

---

## 2. Design Decisions

**Architecture**: Single stored procedure with composite return type

**Key Design Choices**:

1. **Composite Return Type**:

   ```sql
   CREATE TYPE user_registration_result AS (
       result_code INTEGER,
       message TEXT,
       user_id BIGINT
   );
   ```

   - Enables structured error handling
   - Avoids exceptions for business logic failures

2. **Idempotency via processed_requests Table**:
   - Fast path: Check request_id before any writes
   - Prevents duplicate registrations from retries
   - Handles concurrent duplicate requests via unique constraint

3. **Input Validation Order**:
   - NULL/empty checks first (cheapest)
   - Email format validation second (regex)
   - Database constraints last (most expensive)

4. **Error Code Strategy**:
   - SQLite-style codes for compatibility
   - 0 = Success, 19 = Constraint violation, 21 = Invalid input

---

## 3. Implementation Strategy

**Execution Flow**:

```
Input validation
  ↓
Idempotency check (SELECT from processed_requests)
  ↓
BEGIN transaction
  ↓
INSERT users → get user_id
  ↓
INSERT user_profiles
  ↓
INSERT processed_requests
  ↓
INSERT audit_log (SUCCESS)
  ↓
COMMIT
```

**Error Handling**:

- Input errors: Return immediately with code 21
- Duplicate email: Catch unique_violation, return code 19
- Concurrent request_id: Catch unique_violation on processed_requests, return existing user_id
- Other errors: Return code 1 with generic message

---

## 4. Test Coverage

**Test Classes** (24 tests total):

1. **TestCorrectBillingResults** (3 tests)
   - Successful registration
   - Duplicate email rejection
   - Idempotent request handling

2. **TestPerformanceOnLargeDatasets** (2 tests)
   - Bulk registration (100 users < 10s)
   - Query performance with existing data

3. **TestConcurrentExecution** (3 tests)
   - Concurrent different users (10 parallel)
   - Concurrent same email (race condition)
   - Concurrent idempotent requests

4. **TestErrorCodes** (7 tests)
   - Missing/empty/invalid inputs → code 21
   - Duplicate email → code 19

5. **TestInvalidInputHandling** (3 tests)
   - NULL inputs
   - Whitespace-only inputs
   - Invalid email formats

6. **TestSafeDeterministicBehavior** (4 tests)
   - Email normalization (lowercase)
   - Whitespace trimming
   - Audit logging (success/failure)

7. **TestPostgreSQLBestPractices** (2 tests)
   - Atomic transactions
   - Function signature unchanged

---

## 5. Key Implementation Details

**Type Casting**:

```sql
RETURN (CONST_SQLITE_OK, 'User registered successfully'::TEXT, v_new_user_id);
```

- Explicit TEXT and BIGINT casts required for composite type
- Prevents "returned type does not match expected type" errors

**Email Validation**:

```sql
IF TRIM(p_email) !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
```

- Trim before regex validation
- Case-insensitive match

**Normalization**:

```sql
INSERT INTO users (email, password_hash, created_at)
VALUES (LOWER(TRIM(p_email)), p_password_hash, p_registration_timestamp)
```

- Lowercase and trim email before storage
- Ensures uniqueness constraint works correctly

**Concurrent Idempotency**:

```sql
ELSIF v_constraint_name = 'processed_requests_pkey' THEN
    SELECT user_id INTO v_existing_user_id
    FROM processed_requests
    WHERE request_id = p_request_id;
    RETURN (CONST_SQLITE_OK, 'Request already processed (Concurrent)'::TEXT, v_existing_user_id);
```

- Handles race condition when two requests with same request_id arrive simultaneously
- One succeeds, other catches constraint violation and returns same user_id

---

## 6. Testing Infrastructure

**Docker Compose Setup**:

- PostgreSQL 15 Alpine container
- Python 3.12 test container
- Health checks ensure DB ready before tests
- Automatic network creation for service communication

**Test Fixtures**:

- `setup_database`: Creates tables and loads SQL function (session scope)
- `clean_tables`: Truncates data between tests (function scope)
- `db_connection`: Shared connection with autocommit

**Concurrent Testing**:

- ThreadPoolExecutor with separate connections per thread
- Tests race conditions and serialization behavior

---

## 8. Lessons Learned

**PostgreSQL Specifics**:

- Composite types require explicit casting in RETURN statements
- TRIM() needed before regex validation for whitespace handling
- GET STACKED DIAGNOSTICS for constraint name inspection

**Concurrency Patterns**:

- Idempotency table with unique constraint handles race conditions elegantly
- No need for explicit locking when using database constraints correctly

**Testing Best Practices**:

- Separate connections for concurrent tests
- Session-scoped fixtures for expensive setup
- Function-scoped cleanup for test isolation

---

## 9. Future Considerations

**When to Revisit**:

- If email verification workflow needed (add pending_users table)
- If password complexity rules change (add validation function)
- If audit requirements expand (add more detailed logging)
- If scale requires sharding (partition by user_id range)

**Potential Enhancements**:

- Add email verification token generation
- Implement rate limiting per IP/email
- Add user metadata (registration source, referrer)
- Implement soft delete instead of hard delete

---

## 10. References

**PostgreSQL Documentation**:

- Composite Types: https://www.postgresql.org/docs/current/rowtypes.html
- Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
- PL/pgSQL: https://www.postgresql.org/docs/current/plpgsql.html
