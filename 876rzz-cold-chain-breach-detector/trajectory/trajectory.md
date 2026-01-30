# Trajectory Report: Cold Chain Breach Detector Refactoring

## 1. Audit of Original Code (repository_before)

### Structural Analysis

The broken implementation (`tests/resource/broken-code/breach_detector.go`) reveals fundamental architectural flaws:

**Data Structure Issues:**
- Single flat `readings []TemperatureReading` array for all shipments (line 9)
- No per-shipment isolation (cross-contamination risk)
- No chronological ordering mechanism
- No memory bounds (unbounded growth)

**Algorithmic Flaws:**
- **Line 14**: Naive append without sorting → breaks chronological order
- **Lines 17-22**: Counts readings instead of calculating cumulative duration
- **Line 24**: Arbitrary threshold (`count > 100`) instead of time-based logic
- No sliding window implementation (reads all historical data)
- No time-based calculations using `time.Duration`

**Hidden Side Effects:**
- Out-of-order readings corrupt chronological calculations
- All shipments share same readings array (no isolation)
- No purging mechanism → memory leak over time
- Cumulative calculation fundamentally incorrect (count ≠ duration)

**Reference**: [Design Dead](https://martinfowler.com/articles/designDead.html) - The broken code exhibits "God Object" anti-pattern (single struct handling all concerns) and "Primitive Obsession" (using count instead of duration abstraction).

## 2. Refactoring/Improvement Contract

### Constraints for Safe Refactoring

**Deterministic Behavior:**
- Same input sequence → same output (regardless of arrival order)
- Time calculations must use `time.Duration` (no floating-point drift)
- Window boundaries calculated explicitly from current time

**Explicit Dependencies:**
- Per-shipment tracking (map structure, not shared array)
- Chronological ordering enforced via binary search insertion
- Window boundaries: `currentTime.Add(-WindowDuration)`
- Duration calculations: explicit `Timestamp.Sub()` operations

**No Hidden Side Effects:**
- Shipment isolation: map key = shipment ID
- Reading insertion maintains chronological integrity
- Memory purging doesn't corrupt cumulative calculations
- Out-of-order insertion triggers recalculation

**Predictable Test Outcomes:**
- Tests order-independent (fresh detector per test)
- No shared mutable state between test cases
- Edge cases explicitly validated (boundary conditions, sparse readings)

**Reference**: [Design by Contract](https://martinfowler.com/bliki/DesignByContract.html) - The contract requires: (1) cumulative duration = sum of time periods above threshold, (2) window = last 24 hours, (3) status transitions are deterministic.

## 3. Issue Statement to Code Mapping

### Root Cause Analysis

| Issue | Broken Code Location | Root Cause | Impact |
|-------|---------------------|------------|--------|
| **Incorrect Cumulative Calculation** | Lines 17-22 | Counts readings (`count++`) instead of summing durations | Fails `TestCumulativeBreachThreeSpikes` - three 15-min spikes (1801s) not detected |
| **Out-of-Order Data Corruption** | Line 14 | Naive append breaks chronological order | Fails `TestOutOfOrderReadings` - late arrivals corrupt duration calculations |
| **No Sliding Window** | Missing | All historical readings considered | Fails `TestWindowExit` - 40-min spike 25h ago incorrectly triggers breach |
| **No Memory Management** | Missing | Unbounded growth with thousands of shipments | Production memory leak, O(n) scans over all history |
| **No Multi-Shipment Support** | Single array | All shipments share readings | Fails `TestMultipleShipments` - cross-contamination between shipments |
| **Wrong Threshold Logic** | Line 24 | `count > 100` instead of `duration > 1800s` | Fails all breach detection tests |

### Failure Mode Mapping

**TestCumulativeBreachThreeSpikes Failure:**
- **Expected**: Three 15-minute spikes (900s + 900s + 1s = 1801s) → COMPROMISED
- **Broken Behavior**: Counts 6 readings above threshold → `count = 6` → SAFE (wrong)
- **Root Cause**: Fundamental misunderstanding - requirement is cumulative *duration*, not event count

**TestWindowExit Failure:**
- **Expected**: 40-minute spike 25h ago → SAFE (outside window)
- **Broken Behavior**: All historical readings scanned → breach detected (wrong)
- **Root Cause**: No window filtering mechanism

**TestOutOfOrderReadings Failure:**
- **Expected**: Readings [t+20min, t+10min, t] → correctly sorted → SAFE (20min < 30min)
- **Broken Behavior**: Chronological order broken → duration calculation incorrect
- **Root Cause**: Append without sorting breaks time-series integrity

**Reference**: [Root Cause Analysis](https://www.atlassian.com/incident-management/postmortem/root-cause-analysis) - The primary root cause is **conceptual misunderstanding**: treating cumulative heat exposure as an event count rather than a time duration.

## 4. Instance and Dependency Structure Analysis

### Broken Code Structure

**Instance Lifecycle:**
```go
detector := &BreachDetector{readings: []}  // Single shared array
detector.ProcessReading(reading)           // Appends, counts, returns
```

**Dependency Flow:**
- `ProcessReading` → append → count → threshold check
- No isolation between shipments
- No recalculation on out-of-order data
- No state management (cumulative duration not stored)

**Implicit Dependencies:**
- Global readings array (hidden shared state)
- Arrival order = chronological order (false assumption)
- Count = duration (conceptual error)

### Refactored Code Structure

**Instance Lifecycle:**
```go
detector := NewBreachDetector()  // Creates map of shipments
detector.ProcessReading(reading)  // getOrCreateTracker → insertReading → 
                                  // purgeOldReadings → recalculateCumulativeDuration
```

**Dependency Flow:**
1. `ProcessReading` → `getOrCreateTracker` (lazy initialization)
2. → `insertReading` (binary search, maintains order)
3. → `purgeOldReadings` (memory management)
4. → `recalculateCumulativeDuration` (explicit calculation)
5. → status check

**Explicit Dependencies:**
- Per-shipment map: `shipments map[string]*ShipmentTracker`
- Sorted readings: `readings []TemperatureReading` (chronological)
- Stored cumulative: `cumulativeDuration time.Duration` (cached, recalculated on change)
- Window boundaries: `currentTime.Add(-WindowDuration)` (explicit)

**Isolation Guarantees:**
- Each shipment tracked independently (map key isolation)
- No shared mutable state between shipments
- Readings stored per-shipment (no cross-contamination)

**Reference**: [Separation of Concerns](https://martinfowler.com/bliki/SeparationOfConcerns.html) - The refactored code separates: (1) data insertion, (2) memory management, (3) duration calculation, (4) status evaluation. Each concern has dedicated function.

## 5. Test Strategy Evaluation

### Test Design Patterns

**Requirement-Driven Tests:**
- `TestCumulativeBreachThreeSpikes`: Directly validates cumulative duration requirement
- `TestWindowExit`: Validates 24-hour sliding window requirement
- `TestOutOfOrderReadings`: Validates chronological integrity requirement
- Each requirement has explicit test coverage

**Edge Case Validation:**
- `TestThresholdBoundary`: Exactly 8.0°C vs 8.0001°C (boundary condition)
- `TestContinuousBreach`: Exactly 30 minutes vs 30m1s (threshold crossing)
- `TestMultipleShipments`: Isolation verification

**Isolation Testing:**
- Each test creates fresh `BreachDetector` instance
- No shared state between tests
- Deterministic input → deterministic output

### Test Determinism

**Strengths:**
- Tests use explicit timestamps (not `time.Now()` in critical calculations)
- No shared state between tests
- Test order doesn't matter (good isolation)

**Potential Weaknesses:**
- Some tests use `time.Now()` as base time (acceptable for relative calculations)
- Last reading duration calculation depends on `currentTime` parameter (explicit, not hidden)

### Coverage Assessment

**Functional Paths Covered:**
- ✅ Safe temperature handling
- ✅ Single reading above threshold (insufficient duration)
- ✅ Cumulative breach detection (three spikes)
- ✅ Window boundary handling (old data purged)
- ✅ Out-of-order insertion
- ✅ Continuous breach (31 minutes)
- ✅ Multiple shipments (isolation)
- ✅ Threshold boundary (8.0°C exactly)

**Missing Edge Cases (Non-Critical):**
- Reading exactly at 24h boundary (partially covered by `TestWindowExit`)
- Very sparse readings (1 reading per day) - duration calculation handles this
- Rapid temperature oscillations - covered by cumulative logic

**Reference**: [Test Isolation](https://martinfowler.com/articles/mocksArentStubs.html) - Tests are properly isolated with no shared state. [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) - All tests are unit tests (fast, deterministic, focused).

## 6. Refactor/Improvement Approach Reasoning

### High-Level Solution Strategy

**Problem Decomposition:**

1. **Data Structure Selection**
   - **Map for shipments**: O(1) lookup, enables multi-shipment isolation
   - **Sorted slice for readings**: Enables binary search insertion (O(log n) find, O(n) insert)
   - **Trade-off**: Slice insertion is O(n), but necessary for chronological correctness

2. **Algorithm Design**
   - **Insertion**: Binary search (`sort.Search`) for O(log n) position finding, then O(n) insertion
   - **Purge**: Binary search for window boundary + O(1) slice truncation
   - **Recalculation**: Linear scan through readings in window, O(n) duration calculation
   - **Overall**: O(n) per reading (acceptable for correctness guarantee)

3. **Correctness Guarantees**
   - Chronological order maintained → enables correct duration calculation
   - Window filtering ensures only relevant readings considered
   - Recalculation after each modification ensures consistency
   - Out-of-order insertion → same final state as in-order insertion

### Architectural Decisions

**1. Separation of Concerns:**
- `insertReading`: Handles chronological insertion only (single responsibility)
- `purgeOldReadings`: Handles memory management only
- `recalculateCumulativeDuration`: Handles duration calculation only
- Each function has single, testable responsibility

**2. Explicit State Management:**
- Cumulative duration stored in `ShipmentTracker` (not recalculated on every query)
- Recalculated only when readings change (efficiency optimization)
- Stored value can become stale if `GetStatus` called with future time (acceptable trade-off, recalculates)

**3. Error Handling Strategy:**
- No explicit error returns (API design choice - simple status return)
- Invalid inputs (negative time, etc.) handled by Go's type system
- Edge cases (empty readings, single reading) handled explicitly in `recalculateCumulativeDuration`

### Verification Strategy

**Logical Checks:**
1. Cumulative duration never decreases (monotonic property) - unless window purges old data
2. Duration bounded by window size (max 24h of readings in window)
3. Status transitions: SAFE → COMPROMISED (never reverse without purge or time passage)

**Deterministic Behavior:**
- Same reading sequence → same cumulative duration (regardless of arrival order)
- Out-of-order insertion → same final state as in-order insertion
- Window purge → cumulative duration correctly updated

**Test Validation:**
- All requirements have explicit test cases
- Edge cases validated with boundary conditions
- Multiple shipments tested for isolation

**Reference**: [Explicit vs Implicit](https://peps.python.org/pep-0020/) - "Explicit is better than implicit." The refactored code makes all calculations explicit: window boundaries, duration sums, chronological ordering.

## 7. Verification and Validation Thinking

### Root Cause Prevention

**Issue**: Incorrect cumulative duration calculation
- **Prevention**: Explicit iteration through readings, adding durations between consecutive readings
- **Validation**: `TestCumulativeBreachThreeSpikes` with known durations (15min + 15min + 1sec = 1801sec)
- **Verification**: Mathematical correctness - sum of time periods, not event count

**Issue**: Memory leak from old readings
- **Prevention**: Automatic purging after each reading (`purgeOldReadings` called in `ProcessReading`)
- **Validation**: `TestWindowExit` with readings >24h old, verify they're removed
- **Verification**: Memory bounded by active shipments × readings in 24h window

**Issue**: Out-of-order data corruption
- **Prevention**: Binary search insertion maintains chronological order
- **Validation**: `TestOutOfOrderReadings` with reverse-ordered readings, verify same result as in-order
- **Verification**: Insertion algorithm guarantees sorted order regardless of arrival order

**Issue**: Multi-shipment cross-contamination
- **Prevention**: Map-based isolation (each shipment has independent tracker)
- **Validation**: `TestMultipleShipments` verifies independent tracking
- **Verification**: No shared state between shipments (map key isolation)

### Regression Prevention

**Test Coverage:**
- All requirements have dedicated tests
- Edge cases explicitly tested (boundary conditions, sparse data)
- Meta-tests validate test completeness

**Code Structure:**
- Clear separation of concerns (easier to modify without breaking)
- Explicit calculations (easier to verify correctness)
- No hidden state (easier to reason about)

**Mathematical Verification:**
- Cumulative duration = sum of all periods where temperature > 8°C
- Implementation correctly sums durations between consecutive readings
- Window filtering correctly excludes old readings

**Behavioral Verification:**
- Status changes immediately when threshold crossed (tested in `TestContinuousBreach`)
- Old breaches correctly removed from window (tested in `TestWindowExit`)
- Out-of-order data handled correctly (tested in `TestOutOfOrderReadings`)

**Reference**: [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) - Comprehensive unit test coverage provides regression prevention. The test suite validates both functional requirements and edge cases.

## Engineering Principles Applied

1. **Explicit over Implicit**: All calculations use explicit time operations (`time.Duration`, `Timestamp.Sub()`)
2. **Separation of Concerns**: Each function has single responsibility (insertion, purging, calculation, status)
3. **Design by Contract**: Implementation satisfies all requirement constraints (24h window, 30min threshold, cumulative duration)
4. **Test-Driven Validation**: Requirements map to explicit test cases
5. **Memory Efficiency**: Bounded storage with automatic purging (O(1) per shipment for old data)
6. **Correctness over Performance**: O(n) operations acceptable for correctness guarantee (binary search + linear scan)

## Conclusion

The refactoring trajectory demonstrates a **correctness-first** approach:

**What was broken:**
- Conceptual error: counting events instead of summing durations
- Architectural flaw: single shared array, no isolation
- Missing features: no sliding window, no out-of-order handling, no memory management

**Why it failed:**
- Root cause: fundamental misunderstanding of requirement (count vs. duration)
- Secondary causes: no chronological ordering, no window filtering, no shipment isolation

**How the solution fixes it:**
- Explicit duration calculation (sum of time periods, not event count)
- Chronological ordering via binary search insertion
- Window filtering with automatic purging
- Per-shipment isolation via map structure
- Recalculation after each modification ensures consistency

**Key Insight**: For time-series data with sliding windows, maintaining chronological order is critical. Binary search insertion + explicit recalculation ensures correctness even with out-of-order data, at the cost of O(n) operations per reading—an acceptable trade-off for correctness guarantees in pharmaceutical logistics where false negatives are unacceptable.
