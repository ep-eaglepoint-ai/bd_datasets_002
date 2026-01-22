# Trajectory: Flight Model Refactor to Pydantic v2

### 1. Phase 1: Audit / Requirements Analysis (Identifying Root Causes)
**Guiding Question**: "What is the actual problem, not just the symptom?"

**Reasoning**: 
Initial observation of `repository_before` revealed a flight system built on standard Python dataclasses. While dataclasses are excellent for simple data containers, they lack the "defensive shell" required for external data ingestion (like flight scrapers). The root issue isn't just a few missing checks, but the choice of a tool that doesn't enforce schema integrity by default.

**Specific Issues Identified**:
- **Silent Validation Failures**: In `FlightSearchRequestDC`, the `__post_init__` method simply `pass`es when a `return_date` is before a `departure_date`. This results in logically corrupted data entering the system.
- **Type Coercion Absence**: Dataclasses do not coerce types. If a scraper provides a price as `"299.99"`, it remains a string, causing runtime `TypeError` when performing math operations later.
- **Unsafe Mutability**: The models are mutable, which is dangerous in asynchronous pipelines where shared state should be avoided.
- **Weak Format Enforcement**: Airport codes (IATA) are only checked for length, allowing numeric or lowercase values that violate industry standards.

**Implicit Requirements**: 
As a senior engineer, I recognize that this code will likely be used by an LLM agent or an automated scraper. Therefore, the models must "fail fast" with descriptive error messages to allow the agent/system to correct its input immediately.

---

### 2. Phase 2: Question Assumptions (Reframing the Problem)
**Guiding Question**: "Why are we doing this? Is this the right approach?"

**Reasoning**: 
One might assume that adding more `if` statements to `__post_init__` is sufficient. However, I am challenging this "patch-work" approach. The reality is that manual validation is a maintenance burden that grows quadratically with model complexity. 

**Reframed Understanding**: 
Instead of "improving the dataclasses," we should "adopt a validation-first framework." Pydantic v2 provides a declarative way to define these constraints, moving the logic from imperative code (hard to test) to schema definitions (deterministic and self-documenting).

**Lesson**: Never build custom validation logic when a specialized library exists that has already solved for edge cases like type coercion and nested object validation.

---

### 3. Phase 3: Define Success Criteria (Establishing Goals)
**Guiding Question**: "What does 'better' mean in concrete, measurable terms?"

**Success Dimensions**:
- **Correctness**: 
    - Before: `return_date < departure_date` results in an object being created anyway.
    - After: `return_date < departure_date` raises an explicit `ValidationError`.
- **Safety**: 
    - Before: Fields can be modified after creation (`mutable`).
    - After: All models are `frozen`, ensuring data integrity across threads/tasks.
- **Robustness**: 
    - Before: String inputs for floats or ints are stored as strings.
    - After: Automatic coercion to the correct type or validation error if impossible.
- **IATA Compliance**: 
    - Before: Length check only.
    - After: Regex-backed validation for 3 uppercase letters and automatic case coercion.

---

### 4. Phase 4: Map Requirements to Validation (Defining Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
I am implementing a **Transformation Test Suite** (`tests/test_fail_to_pass.py`). This is a critical training artifact.

**Traceability Matrix**:
- **REQ-01 (Coercion)**: `test_type_coercion_is_enforced` must fail on `before` (type is string) and pass on `after` (type is int).
- **REQ-05 (Cross-field)**: `test_return_date_validation_is_not_silent` must fail on `before` (no exception raised) and pass on `after` (`match="return_date"`).
- **REQ-06 (Immutability)**: `test_immutability` must fail on `before` (mutation allowed) and pass on `after` (exception raised).
- **REQ-11 (Format)**: `test_iata_format_validation` ensures content-based validation (IATA) instead of just length.

---

### 5. Phase 5: Scope the Solution
**Guiding Question**: "What is the smallest edit that achieves the goal?"

**Change Surface**:
The refactor focuses entirely on `repository_after/flight_model.py`. 

**Impact Assessment**:
- **Deletions**: Manual `__post_init__` methods and `@dataclass` decorators.
- **Additions**: `pydantic.BaseModel`, `Field` with regex/bounds, and `model_validator(mode='after')`.
- **Net Change**: Slightly more lines due to declarative fields, but significantly less "active" logic to maintain.

---

### 6. Phase 6: Trace Data/Control Flow (Following the Path)
**Guiding Question**: "How does data/control flow change?"

**Before**:
`Raw Input` -> `Dataclass __init__` -> `__post_init__` -> `Silent logical bypass` -> `Invalid Object State` -> `Downstream Crash`

**After**:
`Raw Input` -> `Pydantic BaseModel` -> `Type Coercion` -> `Field Validation (Regex/Bounds)` -> `Model Validator (Logical checks)` -> `Guaranteed Valid Immutable Object`

The control flow is now "Front-Loaded," ensuring no code executes with invalid data.

---

### 7. Phase 7: Anticipate Objections (Playing Devil's Advocate)
**Guiding Question**: "What could go wrong? What objections might arise?"

**Objection 1**: "Pydantic has runtime overhead compared to dataclasses."
- **Counter**: Flight scraping is typically I/O bound. The micro-optimization of using dataclasses is dwarfed by the cost of handling "dirty" data downstream. Pydantic v2 (Rust core) is exceptionally fast.

**Objection 2**: "Why not use `dataclass(frozen=True)`?"
- **Counter**: Frozen dataclasses still don't provide type coercion or sophisticated cross-field error reporting out of the box.

**Objection 3**: "Does this break the existing API?"
- **Counter**: No. I have preserved the field names and the `FlightClass` enum to maintain backward compatibility with any code that consumes these objects.

---

### 8. Phase 8: Verify Invariants / Define Constraints
**Guiding Question**: "What must remain true before, during, and after this change?"

**Must Preserve**:
- Field names (`origin`, `destination`, `price`, etc.) remain identical.
- Enum values (`economy`, `business`) are unchanged.

**Must Improve**:
- Error visibility: Every validation breach results in a `ValidationError`.
- Type integrity: Prices must be floats, passengers must be integers.

**Must Not Violate**:
- The "Business Intent": The purpose of the system (searching/booking flights) must not be altered by the validation refactor.

---

### 9. Phase 10: Measure Impact / Verify Completion
**Guiding Question**: "Did we actually improve? Can we prove it?"

**Metric Breakdown**:
- **Silent Failures**: 1 (repository_before) -> 0 (repository_after).
- **Validation Depth**: Length Check -> Regex + Logic Check.
- **Immutability Status**: Mutable -> Frozen (Thread-Safe).
- **Type Safety**: Coercion Enabled.

**Completion Evidence**: 
Execution of `evaluation/evaluation.py` confirms that `repository_before` fails the rigorous test suite, while `repository_after` passes 100% of cases.

---

### 10. Phase 11: Document the Decision (Capture Context)
**Guiding Question**: "Why did we do this, and when should it be revisited?"

**Problem**: The dataclass-based model allowed high-risk, logically invalid flight data to persist silently, threatening the reliability of flight booking pipelines.
**Solution**: Migrated to Pydantic v2 to enforce schema-level immutability, type coercion, and cross-field logic.
**Trade-offs**: Added Pydantic as a dependency.
**When to revisit**: If the system needs to move to a zero-copy serialization format (like Cap'n Proto) for ultra-low latency requirements.

Learn more about **Pydantic v2 Validation**: Robust data validation and settings management using Python type hints.
Link: [https://docs.pydantic.dev/latest/concepts/validators/](https://docs.pydantic.dev/latest/concepts/validators/)
