# Development Trajectory: Python IoT Environmental Stream Refactor

## Overview & Problem Understanding

### Initial Analysis

**What is being asked?**
The task requires refactoring a monolithic Python-based IoT data processing script into a modular, strategy-driven pipeline following the Single Responsibility Principle. The legacy `process_telemetry_batch` function mixes validation, calibration, unit conversion, and alert generation in a single high-complexity function.

**Key Questions Asked:**
1. What is the processing order in the legacy code?
   - Answer: Validation → Calibration → Unit Conversion → Alert Generation → Statistics
2. How do different sensor models handle calibration?
   - Answer: Alpha subtracts 1.5, Beta uses log10*10 for CO2 or adds 0.8 for others
3. When is F to C conversion applied?
   - Answer: AFTER calibration, not before (critical for mathematical parity)
4. How should malformed data be handled?
   - Answer: Log ProcessError and continue processing, don't fail the batch

**Core Requirements Identified:**
1. Pipeline Architecture - Discrete, interchangeable Processor classes
2. Strategy Pattern - CalibrationRegistry with model-specific strategies
3. Mathematical Parity - Identical results, 2 decimal precision
4. Separation of Concerns - InsightEngine decoupled from normalization
5. Input Resilience - ProcessError logging, continue processing
6. Testing (Parity) - Beta CO2 sensor val=100.0 → normalized=20.0
7. Testing (Extensibility) - RangeFilter added without modifying existing code

### External References Consulted

- **Strategy Pattern**: GoF design pattern for interchangeable algorithms
  - Reference: https://refactoring.guru/design-patterns/strategy
- **Pipeline Pattern**: Chain of responsibility for data processing
  - Reference: https://www.enterpriseintegrationpatterns.com/patterns/messaging/PipesAndFilters.html
- **Single Responsibility Principle**: SOLID principles
  - Reference: https://en.wikipedia.org/wiki/Single-responsibility_principle

---

## Phase 1: Architecture Design

### Decision: Pipeline Architecture

**Question:** How should we structure the processing flow?

**Analysis Options:**
1. **Functional composition**: Chain of functions with data passed through
2. **Class-based processors**: Each step is a Processor class with `process()` method
3. **Decorator pattern**: Wrap each processing step around the previous

**Rationale:** Chose class-based processors because:
- Each processor has single responsibility
- Easy to add/remove/reorder processors
- Context object allows state sharing between processors
- Testable in isolation

**Implementation:**
```python
class Processor(ABC):
    @abstractmethod
    def process(self, context: PipelineContext) -> PipelineContext:
        pass

class Pipeline:
    def __init__(self, processors: List[Processor]):
        self._processors = processors

    def process(self, reading: SensorReading) -> ProcessedReading:
        context = PipelineContext(reading=reading, current_value=reading.value)
        for processor in self._processors:
            context = processor.process(context)
        return context
```

**Insight:** Using a `skip` flag in context allows early termination without exceptions.

### Decision: Strategy Pattern for Calibration

**Question:** How do we handle model-specific calibration without hardcoded if-elif chains?

**Analysis Options:**
1. **Dictionary mapping**: Map model names to calibration functions
2. **Strategy classes**: Abstract CalibrationStrategy with concrete implementations
3. **Configuration-driven**: Load calibration rules from config file

**Rationale:** Chose Strategy classes because:
- New models can be added by creating new classes
- Each calibration logic is encapsulated
- Supports runtime registration
- Type-safe with abstract base class

**Implementation:**
```python
class CalibrationStrategy(ABC):
    @abstractmethod
    def calibrate(self, value: float, sensor_type: str) -> float:
        pass

class CalibrationRegistry:
    def __init__(self):
        self._strategies: Dict[str, CalibrationStrategy] = {}
        self._default = DefaultCalibration()
        self.register('Alpha', AlphaCalibration())
        self.register('Beta', BetaCalibration())
```

**Insight:** The registry returns a default strategy for unknown models, ensuring graceful handling of new sensor types.

### Decision: Separation of Analysis

**Question:** How do we decouple alert generation from normalization?

**Rationale:** Created InsightEngine that receives processed data:
- Pipeline returns only normalized ProcessedReading objects
- InsightEngine has AlertGenerator and StatisticsCalculator
- Analysis can be customized independently of normalization

```python
class InsightEngine:
    def analyze(self, results: List[ProcessedReading]) -> Dict[str, Any]:
        return {
            'alerts': self._alerts.generate(results),
            'summary': self._stats.calculate(results)
        }
```

---

## Phase 2: Implementation

### Core Components Built

1. **Data Classes** (`process_sensor_data.py:24-77`)
   - `SensorReading`: Immutable input with `from_dict()` factory
   - `ProcessedReading`: Output with normalized_value and metadata
   - `ProcessError`: Error record for malformed data
   - `PipelineContext`: Mutable context passed through pipeline

2. **Calibration Strategies** (`process_sensor_data.py:83-148`)
   - `CalibrationStrategy`: Abstract base class
   - `AlphaCalibration`: `value - 1.5` (drift correction)
   - `BetaCalibration`: `log10(value) * 10` for CO2, `value + 0.8` otherwise
   - `DefaultCalibration`: No adjustment (pass-through)
   - `CalibrationRegistry`: Maps models to strategies

3. **Pipeline Processors** (`process_sensor_data.py:154-258`)
   - `Sanitizer`: Validates input, sets skip flag
   - `Calibrator`: Applies model-specific calibration via registry
   - `UnitConverter`: F to C conversion for temperature sensors
   - `RangeFilter`: Rejects values outside min/max range
   - `ValueRounder`: Rounds to specified decimal places

4. **Pipeline Orchestrator** (`process_sensor_data.py:265-335`)
   - `Pipeline.process()`: Single reading through all processors
   - `Pipeline.process_batch()`: Batch processing with error collection
   - Thread-safe as all state is in context

5. **InsightEngine** (`process_sensor_data.py:342-409`)
   - `AlertGenerator`: CRITICAL_HEAT and DRY_SOIL alerts
   - `StatisticsCalculator`: Average and count
   - `InsightEngine`: Unified analysis interface

### Problem Tackled: F to C Conversion Order

**Problem:** Initial test failures showed wrong normalized values for Fahrenheit input.

**Analysis:** Expected 18.5 but got 19.17 for Alpha model with val=68, unit=F.

**Investigation:** Read legacy code carefully:
```python
# Legacy order in process_telemetry_batch:
if reading.get('model') == 'Alpha':
    val = val - 1.5  # FIRST: calibrate
if reading.get('type') == 'temp' and reading.get('unit') == 'F':
    val = (val - 32) * (5/9)  # SECOND: convert
```

**Solution:** Legacy applies calibration FIRST, then unit conversion:
- Input: val=68, model='Alpha', unit='F'
- Step 1 (Calibration): 68 - 1.5 = 66.5
- Step 2 (F to C): (66.5 - 32) * 5/9 = 19.17

**Insight:** The test expectations were wrong, not the implementation. Fixed tests to expect 19.17.

### Problem Tackled: Input Resilience

**Problem:** Malformed data should not crash the entire batch.

**Solution:** `SensorReading.from_dict()` returns `None` for invalid input:
```python
@classmethod
def from_dict(cls, data: Dict[str, Any]) -> Optional['SensorReading']:
    try:
        val = data.get('val')
        if val is None or not isinstance(val, (int, float)):
            return None
        return cls(...)
    except (TypeError, ValueError):
        return None
```

Pipeline records `ProcessError` and continues:
```python
if reading is None:
    errors.append(ProcessError(raw_data=raw, error_message="..."))
    continue
```

---

## Phase 3: Test Development

### Mapping Requirements to Tests

| Requirement | Test Class | Tests | Rationale |
|-------------|------------|-------|-----------|
| Pipeline Architecture | TestPipelineArchitecture | 6 | Processor sequence, dynamic addition |
| Strategy Pattern | TestStrategyPattern | 8 | Model calibration, registry operations |
| Mathematical Parity | TestMathematicalParity | 6 | Alpha, Beta, F to C, precision |
| Separation of Concerns | TestSeparationOfConcerns | 6 | AlertGenerator, StatisticsCalculator |
| Input Resilience | TestInputResilience | 7 | Null val, missing keys, error handling |
| Beta CO2 Parity | TestBetaCO2Parity | 3 | val=100.0 → normalized=20.0 |
| RangeFilter Extensibility | TestRangeFilterExtensibility | 6 | Min/max rejection, no code changes |
| Sensor Profiles | TestSensorProfiles | 3 | Industrial/Consumer profiles |
| Thread Safety | TestThreadSafety | 2 | Stateless components |
| Integration | TestIntegration | 2 | End-to-end with mixed sensors |

### Test Details

**TestBetaCO2Parity (Requirement 6):**
- Input: `{model: 'Beta', val: 100.0, type: 'co2'}`
- Expected: `normalized_value = 20.0`
- Calculation: `log10(100) * 10 = 2 * 10 = 20.0`
- Tests: direct strategy, through registry, through pipeline

**TestRangeFilterExtensibility (Requirement 7):**
- Demonstrates adding RangeFilter without modifying existing processors
- Tests: reject below min, reject above max, accept within range
- Validates existing calibration and conversion unchanged

**TestMathematicalParity:**
- Alpha temp: 25.0 → 23.5 (val - 1.5)
- Beta temp: 25.0 → 25.8 (val + 0.8)
- Beta CO2: 100.0 → 20.0 (log10(100) * 10)
- F to C: 68.0F → 19.17C (calibrate first, then convert)

---

## Phase 4: Environment Configuration

### Docker Compose Setup

**Structure:**
```yaml
services:
  app-before:
    command: pytest tests/ --tb=no --no-header -q -rN
    environment:
      - REPO_UNDER_TEST=repository_before

  app-after:
    command: pytest tests/ --tb=no --no-header -q -rN
    environment:
      - REPO_UNDER_TEST=repository_after

  evaluation:
    command: python evaluation/evaluation.py
```

**Test Import Strategy:**
```python
REPO_UNDER_TEST = os.environ.get('REPO_UNDER_TEST', 'repository_after')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', REPO_UNDER_TEST))

# Try to import refactored components
try:
    from process_sensor_data import Pipeline, CalibrationRegistry, ...
    HAS_REFACTORED_COMPONENTS = True
except ImportError:
    HAS_REFACTORED_COMPONENTS = False
```

**Insight:** Tests that require refactored components assert `HAS_REFACTORED_COMPONENTS` first, providing clear failure messages for repository_before.

---

## Phase 5: Verification

### Final Test Results

**repository_before:**
```
FFFFFFFFFFFFFF......FFFFFF...F....FFFFFFFFFFFFF..  [100%]
34 failed, 15 passed in 0.81s
```

**repository_after:**
```
.................................................  [100%]
49 passed in 0.66s
```

### Evaluation Report

```
============================================================
EVALUATION REPORT
============================================================

[repository_before]
  Total: 49, Passed: 15, Failed: 34

[repository_after]
  Total: 49, Passed: 49, Failed: 0

============================================================
SUMMARY
============================================================
  PASS: 34 tests fixed in repository_after
  All 49 tests now passing
```

### Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 49 |
| Passed (after) | 49 |
| Failed (before) | 34 |
| Tests Fixed | 34 |
| Test Classes | 10 |
| Lines of Code (after) | 528 |

### Insights from Testing

1. **Processing order matters** - Calibration before unit conversion matches legacy behavior
2. **Strategy pattern enables extensibility** - New models added without modifying core logic
3. **Context object simplifies state** - Skip flag enables early termination
4. **Separation pays off** - InsightEngine can be swapped or extended independently

---

## Summary

The IoT data processing pipeline successfully implements all 7 requirements:

1. ✅ Pipeline Architecture - 5 discrete Processor classes (Sanitizer, Calibrator, UnitConverter, RangeFilter, ValueRounder)
2. ✅ Strategy Pattern - CalibrationRegistry with Alpha, Beta, Default strategies
3. ✅ Mathematical Parity - All calculations match legacy code, 2 decimal precision
4. ✅ Separation of Concerns - InsightEngine decoupled from Pipeline
5. ✅ Input Resilience - ProcessError logging, batch continues on errors
6. ✅ Beta CO2 Parity - val=100.0 → normalized=20.0 (verified in 3 tests)
7. ✅ RangeFilter Extensibility - Added without modifying existing processors

The 49 tests provide comprehensive coverage including edge cases for malformed data, concurrent access, and all calibration scenarios.
