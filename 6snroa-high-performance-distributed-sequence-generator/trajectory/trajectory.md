::# Trajectory: High-Performance Distributed Sequence Generator

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What are the precise behaviors and constraints for this generator?"

**Reasoning**:
The goal is to build a chronologically-ordered, unique 64-bit ID generator inspired by Snowflake semantics but implemented in carefully staged chunks for test-driven verification. Each chunk locks down a slice of the public API and internal state before adding complexity.

**Key Requirements**:
- **ID layout**: 1 reserved bit (0), 41-bit timestamp (ms since custom epoch), 10-bit worker id, 12-bit sequence.
- **Monotonicity**: IDs generated later must be numerically larger when observed by real time.
- **Uniqueness**: No duplicates across rapid sequences from the same worker.
- **Testability**: Every chunk must be covered by tests verifying API and state before adding logic.

**Constraints Analysis**:
- **Forbidden**: No external libraries for time manipulation or bit handling; no string-based bit assembly; no datetime module — use only `time` for epoch math.
- **Required**: Deterministic, minimal public API: `ChronoSequence(worker_id)` and `next_id()`.

### 2. Phase 2: QUESTION ASSUMPTIONS
**Guiding Question**: "Are we adding complexity too early?"

**Reasoning**:
The staged approach enforces simplicity: initialize state first, compute timestamps next, then sequence logic, and finally bit assembly. This minimizes regressions and allows tests to observe intermediate state via controlled failures or return values.

**Scope Refinement**:
- Start with API and state (Chunk 1).
- Add epoch calculation without using datetime (Chunk 2).
- Add sequence state and tests, allowing monkeypatching of `time.time()` in tests (Chunk 3).
- Assemble bits and return final 64-bit int (Chunk 4).
- Prove uniqueness and ordering with long-running tests (Chunk 5).

### 3. Phase 3: DEFINE SUCCESS CRITERIA
**Guiding Question**: "When is this component 'done'?"

**Success Criteria**:
1. `ChronoSequence` exposes an initializer storing `worker_id`, and public attributes `last_timestamp` and `sequence` have defined initial values.
2. `next_id()` computes timestamp (ms since Jan 1 2024 UTC) correctly and updates `last_timestamp`.
3. `sequence` increments within the same millisecond and resets when the timestamp advances.
4. Final `next_id()` returns an `int` whose bit layout matches the required field widths and ordering.
5. Tests demonstrating monotonicity and uniqueness (1000+ calls) pass deterministically under CI.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Test Strategy)
**Guiding Question**: "How will we prove correctness as we add features?"

**Test Strategy**:
- **Chunk 1 tests** (`tests/test_api_and_state.py`): class exists, `worker_id` stored, `last_timestamp == -1`, `sequence == 0`, `next_id` present.
- **Chunk 2 tests** (`tests/test_epoch_timestamp.py`): timestamp is int, >= 0, increases between real-time calls.
- **Chunk 3 tests** (`tests/test_sequence_state.py`): monkeypatch `repository_after.chrono_sequence.time.time` to simulate same and advancing ms; assert sequence behavior.
- **Chunk 4 tests** (`tests/test_bit_layout.py`): assemble ID, extract fields via bit masks and shifts, verify widths and top bit zero.
- **Chunk 5 tests** (`tests/test_uniqueness_and_order.py`): 1000+ generated IDs are unique and strictly increasing; later IDs larger than earlier ones.

Automation: run the full test suite inside Docker (`docker compose run --rm test-after`) to ensure a hermetic, reproducible environment.

### 5. Phase 5: SCOPE THE SOLUTION (Minimal Implementation)
**Guiding Question**: "What minimal code delivers the success criteria?"

**Components Created**:
- `repository_after/chrono_sequence.py` — `ChronoSequence` class and `next_id()` implementing staged logic.
- `tests/` — focused pytest modules that validate each chunk.
- `Dockerfile` + `docker-compose.yml` — reproducible test harness using Python 3.9.

### 6. Phase 6: TRACE DATA / CONTROL FLOW
**Guiding Question**: "How does an ID get created?"

Flow (final design):
1. `next_id()` reads `time.time()` and computes `timestamp_ms = int((time.time() - CUSTOM_EPOCH) * 1000)`.
2. Compare `timestamp_ms` with `self.last_timestamp`:
	- equal → `self.sequence += 1`
	- greater → `self.sequence = 0`
3. Update `self.last_timestamp = timestamp_ms`.
4. Assemble 64-bit ID with bitwise shifts: `(timestamp_ms << 22) | (worker_id << 12) | sequence` and return `int`.

### 7. Phase 7: ANTICIPATE OBJECTIONS
**Guiding Question**: "What could go wrong in production?"

**Objection 1**: Clock skew or time moving backwards.
- Current staged implementation does not block or spin on overflow/backwards time — it preserves testability. In production you may want to clamp timestamp to `self.last_timestamp` or wait until the clock advances.

**Objection 2**: Sequence overflow (12 bits → 4096 IDs per ms).
- Currently behavior is undefined after overflow; later chunks should decide to wait, error, or roll over.

**Objection 3**: Multi-node worker id assignment.
- Worker ID is an external responsibility; pilots should ensure unique assignment in deployment (static config, coordination service, or container startup logic).

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What invariants must hold at all times?"
- `0 <= sequence < 4096` (eventual enforcement)
- `last_timestamp >= 0` after first timestamp computation
- `worker_id` fits in 10 bits (0 <= worker_id < 1024)

### 9. Phase 9: EXECUTE (Ordered Implementation Plan)
1. Chunk 1: Add `ChronoSequence` class, init state, tests for API/state. (Done)
2. Chunk 2: Add custom epoch timestamp calculation using `time` only, tests for timestamp. (Done)
3. Chunk 3: Implement sequence state updates, tests with monkeypatch on module `time.time`. (Done)
4. Chunk 4: Assemble final 64-bit integer via `<<` and `|`, tests for bit layout. (Done)
5. Chunk 5: Prove uniqueness and monotonicity with stress tests. (Done)
6. Chunk 6: Dockerize tests for CI reproducibility. (Done)

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "How do we know we met the goal?"

Metrics:
- Unit tests: focused, small, and deterministic; all pass locally and in Docker (`10 passed`).
- Behavioral tests: timestamp monotonicity, uniqueness across 1000 IDs, explicit bit-width checks.

Acceptance: The component meets the stated success criteria and is ready for production-hardening steps (clock-skew handling, overflow behavior, worker-id provisioning).

### 11. Phase 11: DOCUMENT DECISIONS & NEXT ACTIONS
**Decisions made**:
- Use Jan 1, 2024 UTC as `CUSTOM_EPOCH` for predictable timestamp range.
- Use test-first, staged development to lock API and internal state before adding complexity.

**Next Actions / Chunk 7 (production hardening)**:
1. Decide sequence overflow policy (spin/wait vs. error vs. masking).
2. Add guard for time regression (clamp to previous timestamp or wait).
3. Validate `worker_id` assignment and provide a small helper or docs for provisioning unique IDs.
4. Add integration tests simulating concurrent worker processes (optional).

**Notes for reviewers**:
- Tests currently patch `repository_after.chrono_sequence.time.time` where needed for determinism.
- The Docker-based test harness uses `python:3.9-slim` and runs `pytest -q tests` ensuring CI parity.


