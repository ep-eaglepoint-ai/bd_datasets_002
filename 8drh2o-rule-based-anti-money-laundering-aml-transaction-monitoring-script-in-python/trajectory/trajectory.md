# Trajectory: Rule-Based AML Transaction Monitoring

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The goal is to build a robust, rule-based AML transaction monitoring system that identifies suspicious activity from transaction data. The system must handle both immediate (stateless) and behavioral (window-based) rules, providing a clear audit trail through alerts and risk scores.

**Key Requirements**:
- **Ingestion**: Read transactions from CSV with validation.
- **Rule Engine**: Implement stateless rules (Large Cash, Round Amount, High Risk Geo/Channel).
- **Behavioral Analysis**: Implement stateful rules via sliding windows (Structuring, Rapid Movement, Frequent Activity).
- **Post-processing**: Deduplicate and sort alerts.
- **Scoring**: Aggregate risk scores per customer.
- **Evaluation**: Generate a timestamped `report.json` with test results and environment metadata.

### 2. Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)
**Guiding Question**: "Is there a simpler way? Why are we doing this from scratch?"

**Reasoning**:
While modern ML-based AML systems exist, a rule-based approach is modular, transparent, and easier to audit for regulatory compliance.

**Scope Refinement**:
- **Initial Assumption**: Might need a database for state.
- **Refinement**: In-memory `deque` with timestamps is sufficient for sliding windows in this project's scope, minimizing infrastructure overhead.

### 3. Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)
**Guiding Question**: "What does 'done' mean in concrete, measurable terms?"

**Success Criteria**:
1. **Rule Accuracy**: All 7 rules (4 stateless, 3 behavioral) correctly identify target patterns in tests.
2. **Data Integrity**: Ingestion handles missing fields gracefully where applicable.
3. **Restructured Excellence**: All source files moved to `repository_after/` root for simplicity.
4. **Reporting**: `evaluation.py` generates detailed `report.json` with 100% pass rate.
5. **Dockerized Environment**: Fully functional `test-after` and `evaluate` services.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
- **Unit Tests**:
    - `test_rules.py`: Verify stateless logic.
    - `test_behavioral.py`: Verify sliding window logic.
- **Integration Tests**:
    - `test_end_to_end.py`: Verify full pipeline from CSV to Alert/Summary exports.
- **Environmental Verification**:
    - `test_imports_after.py`: Ensure clean imports after refactoring.

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: "What is the minimal implementation that meets all requirements?"

**Components**:
- **Logic**: `rules.py`, `behavioral.py`, `scoring.py`.
- **Infrastructure**: `io.py`, `models.py`, `config.py`.
- **Coordination**: `main.py`.
- **Evaluation**: `evaluation/evaluation.py`, `docker-compose.yml`.

### 6. Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)
**Guiding Question**: "How will data/control flow through the new system?"

**Pipeline Flow**:
CSV Input → `io.py` (Validation) → `rules.py` (Stateless Detection) → `behavioral.py` (Windowed Patterns) → `postprocess.py` (Dedup/Sort) → `scoring.py` (Aggregation) → CSV Output.

### 7. Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)
**Guiding Question**: "What could go wrong? What objections might arise?"

**Objection**: "Why move all files to the root of `repository_after`?"
- **Counter**: Simplifies imports for a small package and aligns with the user's explicit preference for a "flatter" structure without nested `aml/` folders.

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What constraints must the new system satisfy?"

**Must Satisfy**:
- **Stateless/Stateful Separation**: Clear logic boundaries.
- **Deterministic Reporting**: `report.json` must be reproducible.
- **Standard Library Primitives**: Use `dataclasses` and `collections` where possible.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
**Guiding Question**: "In what order should changes be made to minimize risk?"

1. **Step 1: Refactor Structure**: Move files and update imports (Completed).
2. **Step 2: Evaluation Script**: Implement `report.json` generation (Completed).
3. **Step 3: Verification**: Run Docker services (Completed).

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "Did we build what was required? Can we prove it?"

**Results**:
- **Tests**: 7/7 test suites passing in `evaluate`.
- **Artifacts**: `report.json` generated with full context.
- **Structure**: Flattened directory verified via `ls`.

### 11. Phase 11: DOCUMENT THE DECISION (Capture Context for Future)
**Problem**: Need a rule-based AML system with automated reporting.
**Solution**: Built a modular Python package in `repository_after` with a custom `evaluation` runner.
**Trade-offs**: Flattened structure is simpler but less "packaged" than a nested one; chosen for development speed and directness.
