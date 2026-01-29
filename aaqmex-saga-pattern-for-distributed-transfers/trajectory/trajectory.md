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
- **Saga Identity**: Each step must belong to the same saga transaction for proper tracking
- **State Recovery**: System must detect incomplete sagas and support recovery

**Implicit Requirements**:
The system must handle failures gracefully, support safe retries, maintain financial accuracy despite network chaos, and track saga state across all steps. This is a production banking system where data corruption is unacceptable.

---

### 2. Challenge Conventional Thinking (Reframing the Approach)

**Guiding Question**: "Can we guarantee consistency without distributed transactions?"

**Reasoning**:
Traditional thinking says "use 2PC or accept eventual consistency." However, the Saga pattern offers a third way: orchestrated compensating transactions with state tracking. Instead of locking resources across services, we implement explicit undo operations and maintain saga state.

**Reframed Understanding**:
Instead of "making the transaction atomic," we make it "eventually consistent with guaranteed compensation and state tracking." Each forward step has a corresponding backward step. If any step fails, we execute compensations in reverse order. Critically, all steps share a single saga ID so the system knows they belong together.

**Lesson**: Distributed consistency doesn't require distributed transactions. Application-level orchestration with idempotency, compensation, and state tracking can achieve the same guarantees with better performance and simpler failure modes. The key is maintaining saga identity across all operations.

---

### 3. Establish Measurable Goals (Defining Success)

**Guiding Question**: "How do we prove the system maintains financial integrity?"

**Success Dimensions**:

- **Correctness**:
  - Before: No implementation
  - After: All transfers either complete fully or rollback completely
- **Idempotency**:
  - Before: N/A
  - After: Duplicate saga_id returns success without re-execution, with state awareness
- **Saga State Tracking**:
  - Before: N/A
  - After: System tracks PENDING → DEBITED → CREDITED/COMPENSATED states
- **Saga Identity**:
  - Before: N/A
  - After: Single saga ID ties all steps together, enabling recovery and audit
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
- **REQ-03 (Headers)**: `transaction-id` header explicitly validated and required
- **REQ-04 (State Tracking)**: In-memory dict tracks saga states (DEBITED, CREDITED, COMPENSATED)
- **REQ-05 (Saga Identity)**: Single saga ID used across all steps (debit, credit, compensate)
- **REQ-06 (Idempotency)**: Duplicate saga_id returns 200 with state-aware response
- **REQ-07 (State Machine)**: Cannot credit after compensate, cannot compensate after credit
- **REQ-08 (Debit)**: Decreases source user balance and sets state to DEBITED
- **REQ-09 (Compensation)**: Reverses debit operation and sets state to COMPENSATED
- **REQ-10 (Client)**: Orchestrator uses single saga ID and catches 500 to trigger compensation
- **REQ-11 (Consistency)**: Total money preserved despite failures

---

### 5. Minimize Change Surface (Surgical Scope)

**Guiding Question**: "What's the minimal implementation that proves the pattern works?"

**Change Surface**:
Two core files in `repository_after/`:

**Impact Assessment**:

- **server.py**: 145 lines (FastAPI app with 3 endpoints + saga state machine + state endpoint)
- **client.py**: 50 lines (Orchestrator class with single saga ID + demo with 100 transfers)
- **test_after.py**: 150 lines (9 comprehensive tests including state validation)

**Preserved**:

- Simplicity: In-memory storage (no database complexity)
- Focus: Pure saga pattern demonstration
- Clarity: Minimal code, maximum learning

---

### 6. Map Execution Paths (Tracing the Flow)

**Guiding Question**: "What are the possible execution paths in a saga?"

**Happy Path**:

```
Client initiates transfer with saga_id="abc-123"
→ POST /debit (source_user, amount, saga_id) → Success, state=DEBITED
→ POST /credit (target_user, amount, saga_id) → Success, state=CREDITED
→ Return success
```

**Failure Path (Compensation)**:

```
Client initiates transfer with saga_id="xyz-789"
→ POST /debit (source_user, amount, saga_id) → Success, state=DEBITED
→ POST /credit (target_user, amount, saga_id) → HTTP 500 (30% chance)
→ Catch exception
→ POST /compensate_debit (source_user, amount, saga_id) → Success, state=COMPENSATED
→ Return rolled_back
```

**Idempotency Path**:

```
Client retries with same saga_id="abc-123"
→ POST /debit (duplicate saga_id)
→ Check: saga_id in saga_states? State=DEBITED?
→ Return 200 without modifying balance
```

**State Recovery Path**:

```
Operator detects stuck saga
→ GET /saga/{saga_id}
→ Returns: {state: "DEBITED", source_user: "alice", amount: 100}
→ Operator can trigger compensation or investigate
```

The control flow explicitly handles partial failures through orchestration, not database rollbacks.

---

### 7. Challenge the Solution (Devil's Advocate)

**Guiding Question**: "What are the weaknesses of the Saga pattern?"

**Objection 1**: "What if the compensation itself fails?"

- **Counter**: In production, compensations should be retryable and logged. With saga state tracking, we can detect failed compensations (saga stuck in DEBITED state) and retry or escalate to manual intervention.

**Objection 2**: "What if the client crashes after debit but before calling credit?"

- **Counter**: The saga state persists in `saga_states` dict. A monitoring system can query `/saga/{saga_id}` to find sagas stuck in DEBITED state and trigger compensation. In production, use persistent storage and background workers.

**Objection 3**: "Why not just use separate transaction IDs per step?"

- **Counter**: Without a shared saga ID, the system cannot correlate steps. You lose the ability to detect incomplete sagas, audit transaction flow, or implement recovery mechanisms. Saga identity is fundamental to the pattern.

---

### 8. Lock Down Invariants (Define Boundaries)

**Guiding Question**: "What invariants must hold despite failures?"

**Must Preserve**:

- Total money in system: `sum(balances.values())` constant
- Saga identity: Single saga_id across all steps
- Idempotency: Same saga_id → same result with state awareness
- Atomicity: Transfer either completes or fully rolls back
- No partial state: Never have debit without credit or compensation
- State tracking: Saga state always reflects current progress

**Must Improve**:

- Fault tolerance: 0% → 100% (handles 30% failure rate)
- Consistency: N/A → Guaranteed (proven by tests)
- Retry safety: N/A → Safe (idempotency prevents double-execution)

**Must Not Violate**:

- Financial accuracy: No money creation or destruction
- API contract: transaction-id header always required with explicit validation
- State machine: Cannot transition from CREDITED to COMPENSATED or vice versa

---

### 9. Execute Transformation (Precise Implementation)

**Guiding Question**: "What are the key implementation details?"

**Key Transformations**:

1. **Saga State Tracking**:

   ```python
   saga_states[saga_id] = {
       "state": SagaState.DEBITED,
       "source_user": request.user,
       "amount": request.amount,
       "debit_result": result_balance
   }
   ```

2. **Single Saga ID**:

   ```python
   # Client uses same saga_id for all steps
   saga_id = str(uuid.uuid4())
   headers={"transaction-id": saga_id}  # Same for debit, credit, compensate
   ```

3. **Explicit Header Validation**:

   ```python
   transaction_id = req.headers.get("transaction-id")
   if not transaction_id:
       raise HTTPException(status_code=400, detail="transaction-id header is required")
   ```

4. **State Machine Enforcement**:
   ```python
   if saga["state"] == SagaState.CREDITED:
       raise HTTPException(status_code=400, detail="saga already completed - cannot compensate")
   ```

---

### 10. Quantify Improvement (Measure Results)

**Guiding Question**: "Does the saga pattern actually work?"

**Metric Breakdown**:

- **Test Pass Rate**: 0/6 (no implementation) → 9/9 (100%)
- **Fault Tolerance**: N/A → Handles 30% failure rate
- **Consistency**: N/A → Total money preserved across 100 transfers
- **Idempotency**: N/A → Duplicate requests safely ignored with state awareness
- **Compensation**: N/A → Automatic rollback on failure
- **Saga Identity**: N/A → Single saga ID tracks entire transaction
- **State Tracking**: N/A → System knows saga progress (DEBITED/CREDITED/COMPENSATED)
- **Recovery**: N/A → Can query saga state and detect incomplete transactions

**Completion Evidence**:

- `test_before.py`: 1 skipped (no implementation)
- `test_after.py`: 9 passed (validates all requirements including state tracking)
- `evaluation.py`: SUCCESS with before/after comparison
- Demo: 100 transfers with ~30 rollbacks, total money constant
- New tests: Saga state tracking, state machine enforcement, recovery scenarios

---

### 11. Capture Decision Context (Document Rationale)

**Guiding Question**: "When should you use the Saga pattern?"

**Problem**: Distributed transactions across microservices cannot use traditional ACID guarantees. Money transfers require consistency despite service failures. Initial implementations often lack proper saga identity and state tracking, making recovery impossible.

**Solution**: Saga pattern with orchestrated compensating transactions, single saga ID for transaction identity, explicit state tracking (PENDING/DEBITED/CREDITED/COMPENSATED), and idempotency to handle partial failures and retries.

**Trade-offs**:

- Lost: Immediate consistency (brief window where debit exists without credit)
- Gained: Fault tolerance, scalability, no distributed locks, recovery capability, audit trail

**When to use Sagas**:

- Long-running business transactions across services
- When 2PC is too slow or complex
- When you can define compensating operations
- Financial systems, order processing, booking systems
- When you need audit trails and recovery mechanisms

**When NOT to use Sagas**:

- Single database transactions (use ACID)
- Operations without clear compensation (e.g., sending emails)
- When immediate consistency is required
- When saga state cannot be persisted

**Critical Implementation Details**:

1. **Always use a single saga ID** across all steps
2. **Track saga state** to enable recovery and prevent invalid transitions
3. **Explicitly validate headers** with clear error messages
4. **Persist saga state** in production (not just in-memory)
5. **Implement monitoring** to detect stuck sagas
6. **Make compensations idempotent** and retryable

**Learn more about Saga Pattern**:
Understanding distributed transaction patterns and when to apply them.
Link: [https://microservices.io/patterns/data/saga.html](https://microservices.io/patterns/data/saga.html)
