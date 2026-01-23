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