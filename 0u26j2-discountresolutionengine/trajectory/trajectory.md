# Development Trajectory

## Task: Discount Resolution Engine (Go)

### Phase 1: Analysis

**Problem Identified:**
- Legacy linear discount models do not support DAG rule dependencies
- Floating-point math causes rounding errors in financial calculations
- No audit trail for applied rules
- Rule conflicts and pruning not supported

### Phase 2: Design

**Architecture:**

1. **Decimal (Fixed-Point)**
   - int64 with 4 decimal places
   - ISO-4217 rounding to cents

2. **DAG Rule Graph**
   - Topological sort for dependency ordering
   - Cycle detection via DFS

3. **Rule Evaluation Engine**
   - Exclusive rules prune branches
   - Stackable rules ordered additive → multiplicative

4. **CalculationManifest**
   - Full audit trail with entry, delta, exit

### Phase 3: Implementation

**Key Components:**
- `Decimal` struct with Add/Sub/Mul/Div/Round
- `Rule` and `Cart` models
- `DAG` for dependency resolution
- `Engine` for evaluation

### Phase 4: Testing

1. **Unit**: Buy 2 Get 1 + 15% Seasonal
2. **Adversarial**: 500 nodes, 50+ depth
3. **Consistency**: 1000 parallel evaluations

### Phase 5: Verification

- All tests pass
- Deterministic results across threads
- No floating-point errors
- Full audit trail per evaluation

### Phase 6: Test Coverage Enhancement

**Additional Tests Added (9 new tests):**

1. **TestEngine_DeterministicManifestEquality_Parallel**
   - Verifies parallel evaluations produce equal manifests (ignoring timestamps)
   - Uses `Equal()` and `ZeroTimestamps()` methods for comparison

2. **TestEngine_TimestampDeterminism**
   - Confirms timestamp is set on each evaluation
   - Verifies structure consistency across runs

3. **TestEngine_FullManifest_OrderAndDelta**
   - Validates manifest order matches topological rule order
   - Confirms delta tracking is accurate per entry

4. **TestDAG_TopologicalSort_TieBreaker**
   - Tests priority tie-breaking by Rule.ID (lexicographic)
   - Ensures deterministic ordering when priorities are equal

5. **TestEngine_Validate_MissingDependency**
   - Validates engine rejects rules with missing dependencies
   - Added `ValidateDependencies()` method to DAG

6. **TestEngine_BuyXGetY_PerSKU_Scoping**
   - Confirms BuyXGetY applies per-SKU, not across SKUs
   - Prevents cross-SKU discount leakage

7. **TestEngine_Evaluate_Idempotence**
   - Verifies `Evaluate()` is pure/idempotent
   - Multiple calls with same input produce same output

8. **TestEngine_DeepNesting_StackSafety_1000Chain**
   - Tests 1000+ rule chain without stack overflow
   - Validates iterative (not recursive) processing

9. **TestEngine_Performance_SLA_100Items_200Rules**
   - Benchmarks P99 latency across 100 runs
   - Confirms P99 < 5ms SLA requirement
   - Actual P99: ~1.8ms

**Implementation Updates:**
- Added `ValidateDependencies()` to DAG for missing dependency detection
- Added `Equal()` method to CalculationManifest for comparison
- Added `ZeroTimestamps()` method for deterministic testing
- Updated `TopologicalSort()` to tie-break by Rule.ID when priorities equal
- Updated `sortByPriority` in Evaluate for consistent tie-breaking

**Final Test Count:** 31 tests (22 original + 9 new)