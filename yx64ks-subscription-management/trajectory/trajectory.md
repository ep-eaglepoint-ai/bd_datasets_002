# Trajectory: PostgreSQL Subscription Management Function

### 1. Root Cause Discovery (Identifying the Real Problem)

**Reasoning**:
Initial observation of `repository_before` revealed an empty implementation - just an `__init__.py` file with no subscription management logic. The challenge was to build a production-ready PostgreSQL function from scratch that handles modern subscription system requirements: concurrency, idempotency, state transitions, and comprehensive auditing.

**Specific Requirements Identified**:

- **Input Validation**: Accept 5 parameters (user_id, plan_id, start_date, status, request_id) with defensive handling
- **Business Entity Validation**: Verify user exists and plan exists + is active
- **Idempotency**: Prevent duplicate operations using request_id deduplication
- **CRUD Operations**: Create new subscriptions or update existing ones (one per user constraint)
- **State Transitions**: Reject invalid transitions (e.g., cancelled → past_due)
- **Audit Trail**: Record all changes in history and audit log tables
- **Transactional Safety**: All writes within atomic scope with proper rollback
- **Error Mapping**: SQLite-style error codes (0=success, 19=constraint, 21=misuse)

**Implicit Requirements**:
As a subscription management system, this function must handle concurrent requests from payment processors, customer portals, and admin dashboards. Race conditions or data corruption would directly impact revenue and customer experience.

---

### 2. Challenge Conventional Thinking (Reframing the Approach)

**Guiding Question**: "Why are we doing this? Is this the right approach?"

**Reasoning**:
One might assume that subscription logic belongs in application code with simple database CRUD operations. However, I challenged this "thin database" mindset. For subscription management, the database layer is the perfect place to enforce business rules, ensure consistency, and provide atomic operations.

**Reframed Understanding**:
Instead of "application handles business logic," we embrace "database as business logic enforcer." PostgreSQL's ACID properties, row-level locking, and exception handling make it ideal for subscription state management. The database becomes the single source of truth for subscription rules.

**Lesson**: Complex business operations with strict consistency requirements benefit from database-level implementation. The database can enforce invariants that application code might miss under load.

---

### 3. Establish Measurable Goals (Defining Success)

**Guiding Question**: "What does 'better' mean in concrete, measurable terms?"

**Success Dimensions**:

- **Correctness**:
  - Before: No implementation (0% functionality)
  - After: All 12 requirements implemented and tested
- **Idempotency**:
  - Before: No duplicate prevention
  - After: Request ID deduplication with cached responses
- **Data Integrity**:
  - Before: No validation or constraints
  - After: User/plan validation, state transition rules, unique constraints
- **Auditability**:
  - Before: No tracking
  - After: Complete history and audit logs for all operations
- **Error Handling**:
  - Before: No error handling
  - After: Structured JSONB responses with SQLite error codes
- **Concurrency**:
  - Before: No concurrency handling
  - After: Row-level locking prevents race conditions

---

### 4. Design Proof Strategy (Building Test Coverage)

**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
Implementing a **Requirement-Driven Test Suite** with explicit traceability to the 12 production requirements.

**Traceability Matrix**:

- **REQ-01 (Accept Inputs)**: `test_accepts_all_required_inputs` validates function signature
- **REQ-02 (User Exists)**: `test_rejects_nonexistent_user` validates user validation
- **REQ-03 (Plan Active)**: `test_rejects_nonexistent_plan`, `test_rejects_inactive_plan` validate plan checks
- **REQ-04 (Idempotency)**: `test_prevents_duplicate_operations` validates request_id deduplication
- **REQ-05 (CRUD)**: `test_creates_new_subscription`, `test_updates_existing_subscription` validate operations
- **REQ-06 (History)**: `test_records_subscription_history` validates audit trail
- **REQ-07 (Logging)**: `test_logs_subscription_operations` validates operational logs
- **REQ-08 (Transactional)**: `test_transactional_rollback_on_error` validates atomicity
- **REQ-09 (State Transitions)**: `test_rejects_invalid_state_transitions` validates business rules
- **REQ-10 (Error Codes)**: `test_sqlite_error_codes` validates error mapping
- **REQ-11 (Input Handling)**: `test_handles_null_inputs`, `test_handles_invalid_status` validate defensive programming
- **REQ-12 (Structured Results)**: `test_returns_structured_result` validates response format

---

### 5. Minimize Change Surface (Surgical Scope)

**Guiding Question**: "What is the smallest edit that achieves the goal?"

**Change Surface**:
The implementation focuses entirely on `repository_after/subscription.sql` - a single file containing the complete solution.

**Impact Assessment**:

- **Additions**: 6 tables (users, plans, subscriptions, history, idempotency, audit), 1 function
- **Net Change**: 0 lines → 200 lines (complete implementation)

**Preserved**:

- Database naming conventions
- PostgreSQL best practices
- Standard error handling patterns

---

### 6. Map Execution Paths (Tracing the Flow)

**Guiding Question**: "How does data/control flow change?"

**Implementation Flow**:

```
Input (user_id, plan_id, start_date, status, request_id)
→ 1. Idempotency Check (return cached response if exists)
→ 2. Input Validation (NULL checks, status enum validation)
→ 3. Business Validation (user exists, plan exists + active)
→ 4. Row Locking (SELECT FOR UPDATE on existing subscription)
→ 5. State Transition Check (prevent invalid transitions)
→ 6. CRUD Operation (INSERT new or UPDATE existing)
→ 7. Audit Trail (INSERT into history and audit tables)
→ 8. Response Construction (JSONB with result_code, message, details)
→ 9. Idempotency Logging (cache response for future requests)
```

The flow is "Database-Native," leveraging PostgreSQL's transaction isolation, locking, and exception handling.

---

### 7. Challenge the Solution (Devil's Advocate)

**Guiding Question**: "What could go wrong? What objections might arise?"

**Objection 1**: "Database functions are harder to test and debug than application code."

- **Counter**: PostgreSQL functions are testable with standard SQL tools. The test suite proves this. Database-level logic is actually easier to test because it's isolated from application deployment complexity.

**Objection 2**: "What if we need to integrate with external services (payment processors, notifications)?"

- **Counter**: The function handles core subscription state management. External integrations belong in application code that calls this function. Separation of concerns is maintained.

**Objection 3**: "Database functions don't scale horizontally like microservices."

- **Counter**: Subscription management is inherently stateful and requires ACID properties. Horizontal scaling would require distributed transactions, which are more complex than vertical scaling of PostgreSQL.

---

### 8. Lock Down Invariants (Define Boundaries)

**Guiding Question**: "What must remain true before, during, and after this change?"

**Must Preserve**:

- Function name: `manage_user_subscription`
- Parameter types: UUID, UUID, TIMESTAMPTZ, TEXT, UUID
- Return type: JSONB with consistent structure
- Business logic: One subscription per user, valid state transitions

**Must Improve**:

- Functionality: 0% → 100% (complete implementation)
- Data integrity: No validation → Complete validation
- Auditability: No tracking → Full audit trail

**Must Not Violate**:

- ACID properties: All operations must be atomic
- Concurrency safety: No race conditions under load
- Data consistency: No orphaned or invalid records

---

### 9. Execute Transformation (Precise Implementation)

**Guiding Question**: "What is the exact transformation?"

**Key Implementation Decisions**:

1. **Schema Design**:

   ```sql
   -- Subscription constraint: one per user
   UNIQUE (user_id)

   -- Audit trail: complete history
   subscription_history, subscription_audit_log
   ```

2. **Idempotency Pattern**:

   ```sql
   -- Check cache first
   SELECT response_payload FROM subscription_idempotency_log
   WHERE request_identifier = p_request_id
   ```

3. **Row-Level Locking**:

   ```sql
   -- Prevent race conditions
   SELECT subscription_id FROM subscriptions
   WHERE user_id = p_user_id FOR UPDATE
   ```

4. **Error Code Mapping**:
   ```sql
   -- SQLite-style codes
   c_sqlite_ok := 0, c_sqlite_constraint := 19, c_sqlite_misuse := 21
   ```

---

### 10. Quantify Improvement (Measure Results)

**Guiding Question**: "Did we actually improve? Can we prove it?"

**Metric Breakdown**:

- **Functionality**: 0% → 100% (complete implementation)
- **Test Coverage**: 0 tests → 15 tests covering all requirements
- **Data Integrity**: No validation → Complete validation with constraints
- **Auditability**: No tracking → Full history and audit logs
- **Error Handling**: No errors → Structured JSONB responses with proper codes
- **Concurrency**: No handling → Row-level locking and transaction isolation

**Completion Evidence**:

- `test_subscription.py`: 15 tests covering all 12 requirements
- `evaluation.py`: SUCCESS with comprehensive test results
- `subscription.sql`: 200 lines of production-ready PostgreSQL code

---

### 11. Capture Decision Context (Document Rationale)

**Guiding Question**: "Why did we do this, and when should it be revisited?"

**Problem**: No subscription management implementation existed. Modern subscription systems require robust handling of concurrency, idempotency, state transitions, and comprehensive auditing.

**Solution**: Implemented a PostgreSQL function that centralizes subscription logic at the database layer, ensuring ACID properties, preventing race conditions, and providing complete audit trails.

**Trade-offs**:

- Lost: Application-layer flexibility for complex business rules
- Gained: Data consistency, concurrency safety, atomic operations, simplified application code

**When to revisit**:

- If subscription rules become too complex for SQL (add application layer)
- If we need real-time notifications (add triggers or event sourcing)
- If we migrate to a different database system (would need complete rewrite)
- If horizontal scaling becomes necessary (consider event sourcing patterns)

**Learn more about PostgreSQL Functions**:
Understanding how to build robust database functions with proper error handling and concurrency control.
Link: [https://www.postgresql.org/docs/current/plpgsql.html](https://www.postgresql.org/docs/current/plpgsql.html)

---
