# Trajectory: Saga Pattern for Distributed Transfers

### 1. Root Cause Discovery (Identifying the Real Problem)

**Guiding Question**: "What happens when a distributed transaction fails halfway through?"

**Reasoning**:
In a monolithic system, database ACID transactions guarantee atomicity—either all operations succeed or all fail. However, when migrating to microservices, a single business transaction (transferring money) spans multiple independent services. If the network fails after debiting the source account but before crediting the target account, money disappears from the system.

**Specific Issues to Solve**:

- **Partial Failure State**: Debit succeeds, credit fails → money lost in transit
- **Network Retries**: Client retries after timeout → risk of double-debit without idempotency
- **No Distributed Transactions**: Cannot use 2PC/XA due to latency and complexity
- **Data Consistency**: Must guarantee total money in system remains constant
- **Fault Injection**: Credit service fails 30% of the time (simulating real-world instability)

**Implicit Requirements**:
The system must handle failures gracefully, support safe retries, and maintain financial accuracy despite network chaos. This is a production banking system where data corruption is unacceptable.

---

### 2. Challenge Conventional Thinking (Reframing the Approach)

**Guiding Question**: "Can we guarantee consistency without distributed transactions?"

**Reasoning**:
Traditional thinking says "use 2PC or accept eventual consistency." However, the Saga pattern offers a third way: orchestrated compensating transactions. Instead of locking resources across services, we implement explicit undo operations.

**Reframed Understanding**:
Instead of "making the transaction atomic," we make it "eventually consistent with guaranteed compensation." Each forward step has a corresponding backward step. If any step fails, we execute compensations in reverse order.

**Lesson**: Distributed consistency doesn't require distributed transactions. Application-level orchestration with idempotency and compensation can achieve the same guarantees with better performance and simpler failure modes.

---

### 3. Establish Measurable Goals (Defining Success)

**Guiding Question**: "How do we prove the system maintains financial integrity?"

**Success Dimensions**:

- **Correctness**:
  - Before: No implementation
  - After: All transfers either complete fully or rollback completely
- **Idempotency**:
  - Before: N/A
  - After: Duplicate transaction_id returns success without re-execution
- **Fault Tolerance**:
  - Before: N/A
  - After: System handles 30% credit failure rate with automatic compensation
- **Consistency**:
  - Before: N/A
  - After: Total money in system preserved across 100 transfers
- **API Contract**:
  - Before: N/A
  - After: Three endpoints with mandatory transaction_id headers

---

### 4. Design Proof Strategy (Building Test Coverage)

**Guiding Question**: "How do we test distributed failure scenarios?"

**Test Strategy**:
Implementing a **Saga-Specific Test Suite** validating compensating transactions and idempotency.

**Traceability Matrix**:

- **REQ-01 (FastAPI)**: Server uses FastAPI framework
- **REQ-02 (Endpoints)**: `/debit`, `/credit`, `/compensate_debit` implemented
- **REQ-03 (Headers)**: `transaction-id` header required on all endpoints
- **REQ-04 (Tracking)**: In-memory Set tracks processed transaction IDs
- **REQ-05 (Fault Injection)**: `/credit` fails 30% of the time with HTTP 500
- **REQ-06 (Idempotency)**: Duplicate transaction_id returns 200 without re-execution
- **REQ-07 (Debit)**: Decreases source user balance
- **REQ-08 (Compensation)**: Reverses debit operation
- **REQ-09 (Client)**: Orchestrator catches 500 and triggers compensation
- **REQ-10 (Consistency)**: Total money preserved despite failures

---

### 5. Minimize Change Surface (Surgical Scope)

**Guiding Question**: "What's the minimal implementation that proves the pattern works?"

**Change Surface**:
Two core files in `repository_after/`:

**Impact Assessment**:

- **server.py**: 60 lines (FastAPI app with 3 endpoints + idempotency)
- **client.py**: 45 lines (Orchestrator class + demo with 100 transfers)
- **test_after.py**: 90 lines (6 comprehensive tests)

**Preserved**:

- Simplicity: In-memory storage (no database complexity)
- Focus: Pure saga pattern demonstration
- Clarity: Minimal code, maximum learning

---

### 6. Map Execution Paths (Tracing the Flow)

**Guiding Question**: "What are the possible execution paths in a saga?"

**Happy Path**:

```
Client initiates transfer
→ POST /debit (source_user, amount) → Success
→ POST /credit (target_user, amount) → Success
→ Return success
```

**Failure Path (Compensation)**:

```
Client initiates transfer
→ POST /debit (source_user, amount) → Success
→ POST /credit (target_user, amount) → HTTP 500 (30% chance)
→ Catch exception
→ POST /compensate_debit (source_user, amount) → Success
→ Return rolled_back
```

**Idempotency Path**:

```
Client retries with same transaction_id
→ POST /debit (duplicate transaction_id)
→ Check: transaction_id in processed_transactions?
→ Return 200 without modifying balance
```

The control flow explicitly handles partial failures through orchestration, not database rollbacks.

---

### 7. Challenge the Solution (Devil's Advocate)

**Guiding Question**: "What are the weaknesses of the Saga pattern?"

**Objection 1**: "What if the compensation itself fails?"

- **Counter**: In production, compensations should be retryable and logged. This demo assumes compensations succeed, but real systems need dead-letter queues and manual intervention workflows.

**Objection 2**: "What if the client crashes after debit but before calling credit?"

- **Counter**: The orchestrator should persist saga state. In this demo, the saga is lost. Production systems use event sourcing or saga state machines with persistence.

**Objection 3**: "Isn't this just eventual consistency with extra steps?"

- **Counter**: Yes, but with guaranteed convergence. Unlike pure eventual consistency, sagas have explicit compensation logic that ensures the system reaches a consistent state.

---

### 8. Lock Down Invariants (Define Boundaries)

**Guiding Question**: "What invariants must hold despite failures?"

**Must Preserve**:

- Total money in system: `sum(balances.values())` constant
- Idempotency: Same transaction_id → same result
- Atomicity: Transfer either completes or fully rolls back
- No partial state: Never have debit without credit or compensation

**Must Improve**:

- Fault tolerance: 0% → 100% (handles 30% failure rate)
- Consistency: N/A → Guaranteed (proven by tests)
- Retry safety: N/A → Safe (idempotency prevents double-execution)

**Must Not Violate**:

- Financial accuracy: No money creation or destruction
- API contract: transaction_id header always required

---

### 9. Execute Transformation (Precise Implementation)

**Guiding Question**: "What are the key implementation details?"

**Key Transformations**:

1. **Idempotency Check**:

   ```python
   if transaction_id in processed_transactions:
       return {"status": "success", "message": "already processed"}
   ```

2. **Fault Injection**:

   ```python
   if random.random() < 0.3:
       raise HTTPException(status_code=500)
   ```

3. **Compensation Logic**:

   ```python
   except httpx.HTTPStatusError as e:
       if e.response.status_code == 500:
           # Compensate: refund the source user
           compensate_response = self.client.post(...)
   ```

4. **Header Handling**:
   ```python
   def debit(request: TransactionRequest, transaction_id: str = Header(...)):
   ```

---

### 10. Quantify Improvement (Measure Results)

**Guiding Question**: "Does the saga pattern actually work?"

**Metric Breakdown**:

- **Test Pass Rate**: 0/6 (no implementation) → 6/6 (100%)
- **Fault Tolerance**: N/A → Handles 30% failure rate
- **Consistency**: N/A → Total money preserved across 100 transfers
- **Idempotency**: N/A → Duplicate requests safely ignored
- **Compensation**: N/A → Automatic rollback on failure

**Completion Evidence**:

- `test_before.py`: 1 skipped (no implementation)
- `test_after.py`: 6 passed (validates all requirements)
- `evaluation.py`: SUCCESS with before/after comparison
- Demo: 100 transfers with ~30 rollbacks, total money constant

---

### 11. Capture Decision Context (Document Rationale)

**Guiding Question**: "When should you use the Saga pattern?"

**Problem**: Distributed transactions across microservices cannot use traditional ACID guarantees. Money transfers require consistency despite service failures.

**Solution**: Saga pattern with orchestrated compensating transactions and idempotency to handle partial failures and retries.

**Trade-offs**:

- Lost: Immediate consistency (brief window where debit exists without credit)
- Gained: Fault tolerance, scalability, no distributed locks

**When to use Sagas**:

- Long-running business transactions across services
- When 2PC is too slow or complex
- When you can define compensating operations
- Financial systems, order processing, booking systems

**When NOT to use Sagas**:

- Single database transactions (use ACID)
- Operations without clear compensation (e.g., sending emails)
- When immediate consistency is required

**Learn more about Saga Pattern**:
Understanding distributed transaction patterns and when to apply them.
Link: [https://microservices.io/patterns/data/saga.html](https://microservices.io/patterns/data/saga.html)
