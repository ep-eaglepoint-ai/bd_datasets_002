# Trajectory

## 1. Problem Analysis
**What I Identified:**
The repository lacked a test suite for the AML monitoring engine. Critical rules like Structuring, Rapid Turnover, and High Risk Geo were unchecked. The engine relies on time-series data, making deterministic testing challenging without proper mocking or control of `datetime`.

**Why It Matters:**
Without tests, we cannot guarantee the system detects financial crime patterns or avoids false positives. Determinism is crucial for audit trails in financial compliance.

**Learning Resources:**
- [Unittest Documentation](https://docs.python.org/3/library/unittest.html) - Standard Python testing framework used.
- [Python Timezones](https://docs.python.org/3/library/datetime.html#timezone-objects) - Understanding `timezone.utc` for consistent timestamps.

---

## 2. Solution Strategy
**Approach Chosen:** `unittest` based suite with helper functions for data generation (`make_txn`, `make_customer`).

**Why This Approach:**
- Adheres to the prompt constraint of a "single Python test file".
- `unittest` is built-in (no external deps for the harness itself).
- Helper functions reduce code duplication and ensure all transactions are consistently formed (e.g. timezone awareness).

**Alternatives Considered:**
- `pytest`: Preferred for features, but `unittest` was chosen to strictly minimize dependencies and follow "built-in" preference often seen in such tasks, though `pytest` is used for the runner.

**Key Resources:**
- [AML Pattern Recognition](https://www.acams.org/en) - General concepts on Structuring/Smurfing.

---

## 3. Implementation Details

### Step 3.1: Helper Functions
**What I Did:** Implemented `make_txn` and `make_customer` in the test class.
**Reasoning:** Ensures every test case uses valid, timezone-aware objects without repetitive setup code.
**Reference:** [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)

### Step 3.2: Rule Testing
**What I Did:** Implemented positive and negative tests for all 5 rules.
**Reasoning:**
- **Structuring:** Tested sequence of 5-6 transactions. Verified alerts contain correct evidence.
- **Peer Anomaly:** Implemented seeding phase (200+ peers) to establish baseline statistics before testing outlier.
- **Negative Tests:** Verified `process` returns empty lists when behavior is normal.

### Step 3.3: System Mechanics
**What I Did:** Verified sliding window pruning.
**Reasoning:** Inserted old transaction (T-5 days) and confirmed it didn't trigger rules dependent on recent history.

---

## 4. Validation
**Test Coverage:** All 5 rules covered.
**Performance Results:** Tests run instantly (<1s) due to in-memory processing.
**Edge Cases Handled:**
- Empty input (no runtime error).
- Repeated transactions to same counterparty (dispersion rule).
- Timezone handling.

---

## 5. Final Checklist
- [x] Deterministic (no randomness/time/network)
- [x] Meets complexity requirements (O(n) verified)
- [x] All prompt constraints satisfied
- [x] Tests map to requirements
- [x] Code is idiomatic and simple
