# Trajectory: Python IoT Environmental Stream Refactor

## Task Overview

Refactor a monolithic Python-based IoT data processing script (`process_telemetry_batch`) into a modular, strategy-driven pipeline following the Single Responsibility Principle.

## Problem Analysis

### Legacy Code Issues

The original `repository_before/process_sensor_data.py` had 5 major problems:

1. **Direct object mutation and scattered validation** - No separation of input parsing/validation
2. **Hardcoded calibration logic per model** - Alpha (-1.5) and Beta (log10 for CO2, +0.8 otherwise) directly embedded in function
3. **Mixed unit conversion logic** - F to C conversion inline with calibration
4. **Tightly coupled alert thresholds** - Alert generation mixed with normalization
5. **Mixed result types and synchronous stats** - Statistics calculated in same function as normalization

### Key Mathematical Operations (must preserve)

- **Alpha model**: `val = val - 1.5`
- **Beta model CO2**: `val = log10(val) * 10` (or 0 if val <= 0)
- **Beta model non-CO2**: `val = val + 0.8`
- **F to C conversion**: `val = (val - 32) * 5/9` (applied AFTER calibration)
- **Rounding**: 2 decimal places

### Processing Order (legacy, must match)

1. Validation (skip if val is None or not numeric)
2. Calibration (model-specific)
3. Unit conversion (F to C)
4. Alert generation
5. Statistics calculation

## Requirements Summary

1. **Pipeline Architecture** - Discrete, interchangeable Processor classes
2. **Strategy Pattern** - CalibrationRegistry with model-specific strategies
3. **Mathematical Parity** - Identical results, 2 decimal precision
4. **Separation of Concerns** - InsightEngine decoupled from normalization
5. **Input Resilience** - ProcessError logging, continue processing
6. **Testing (Parity)** - Beta CO2 sensor val=100.0 → normalized=20.0
7. **Testing (Extensibility)** - RangeFilter added without modifying existing code

## Implementation Steps

### Step 1: Design Data Classes

Created immutable data transfer objects:

- `SensorReading` - Raw input representation with factory method `from_dict()`
- `ProcessedReading` - Output with normalized_value and metadata
- `ProcessError` - Error record for malformed data
- `PipelineContext` - Mutable context passed through processors

### Step 2: Implement Strategy Pattern for Calibration

Created calibration strategies following the Strategy Pattern:

```python
class CalibrationStrategy(ABC):
    @abstractmethod
    def calibrate(self, value: float, sensor_type: str) -> float
```

Concrete implementations:
- `AlphaCalibration` - Subtracts 1.5 (systematic drift correction)
- `BetaCalibration` - log10*10 for CO2, +0.8 for others
- `DefaultCalibration` - No adjustment (pass-through)

`CalibrationRegistry` maps models to strategies, allowing new models without code changes.

### Step 3: Implement Pipeline Processors

Created discrete Processor classes:

```python
class Processor(ABC):
    @abstractmethod
    def process(self, context: PipelineContext) -> PipelineContext
```

Implementations:
1. `Sanitizer` - Validates input, sets skip flag on invalid
2. `Calibrator` - Applies model-specific calibration via registry
3. `UnitConverter` - Converts F to C for temperature sensors
4. `RangeFilter` - Optional filter for out-of-range values (extensibility demo)
5. `ValueRounder` - Rounds to specified decimal places

### Step 4: Implement Pipeline Orchestrator

`Pipeline` class orchestrates processor sequence:

```python
pipeline = Pipeline([
    Sanitizer(),
    Calibrator(),
    UnitConverter(),
    ValueRounder(2)
])
```

Methods:
- `add()` - Dynamic processor addition
- `process()` - Single reading processing
- `process_batch()` - Batch processing with error collection

### Step 5: Implement InsightEngine (Separation of Concerns)

Decoupled analysis from normalization:

- `AlertGenerator` - Creates CRITICAL_HEAT and DRY_SOIL alerts
- `StatisticsCalculator` - Computes average and count
- `InsightEngine` - Unified interface combining both

### Step 6: Implement Drop-in Replacement Function

`process_telemetry_batch()` maintains legacy interface:

```python
def process_telemetry_batch(raw_readings):
    pipeline = create_default_pipeline()
    insight_engine = InsightEngine()
    results, errors = pipeline.process_batch(raw_readings)
    insights = insight_engine.analyze(results)
    return {'data': [...], 'alerts': [...], 'summary': {...}}
```

### Step 7: Write Comprehensive Tests

Created 49 tests covering all 7 requirements:

| Test Class | Tests | Requirement |
|-----------|-------|-------------|
| TestPipelineArchitecture | 6 | #1 Pipeline Architecture |
| TestStrategyPattern | 8 | #2 Strategy Pattern |
| TestMathematicalParity | 6 | #3 Mathematical Parity |
| TestSeparationOfConcerns | 6 | #4 Separation |
| TestInputResilience | 7 | #5 Input Resilience |
| TestBetaCO2Parity | 3 | #6 Parity Testing |
| TestRangeFilterExtensibility | 6 | #7 Extensibility Testing |
| TestSensorProfiles | 3 | Additional |
| TestThreadSafety | 2 | Additional |
| TestIntegration | 2 | End-to-end |

## Key Implementation Details

### F to C Conversion Order

**Critical**: Legacy code applies calibration FIRST, then unit conversion:

```python
# Legacy order:
val = val - 1.5      # Calibration: 68 -> 66.5
val = (val - 32) * 5/9  # F to C: 66.5 -> 19.17
```

This means for input `{model: 'Alpha', val: 68, unit: 'F'}`:
- Expected result: `19.17` (NOT 18.5)

### RangeFilter Extensibility

Demonstrated by `create_pipeline_with_range_filter()`:

```python
Pipeline([
    Sanitizer(),
    Calibrator(registry),
    UnitConverter(),
    RangeFilter(min_value, max_value),  # Added without modifying others
    ValueRounder(2)
])
```

### Sensor Profiles

Created profile factories for different use cases:
- `create_industrial_profile()` - Standard calibration
- `create_consumer_profile()` - Can use custom calibration registry

## Files Changed

### New Files

| File | Description |
|------|-------------|
| `repository_after/process_sensor_data.py` | Refactored modular implementation (528 lines) |
| `tests/test_pipeline.py` | Comprehensive test suite (49 tests) |

### Modified Files

| File | Change |
|------|--------|
| `requirements.txt` | Added pytest>=7.0.0 |
| `docker-compose.yml` | Updated test commands |
| `instances/instance.json` | Added test names to FAIL_TO_PASS |

## Test Results

```
============================= test session starts ==============================
collected 49 items
...
============================== 49 passed in 0.35s ==============================
```

All 49 tests pass, validating:
- Pipeline architecture with discrete processors
- Strategy pattern for calibration extensibility
- Mathematical parity with legacy code
- Separated analysis (InsightEngine)
- Input resilience with ProcessError logging
- Beta CO2 parity (100.0 → 20.0)
- RangeFilter extensibility without modifying existing code

## Architecture Diagram

```
                    Raw Readings
                         │
                         ▼
              ┌──────────────────┐
              │     Pipeline     │
              │                  │
              │  ┌────────────┐  │
              │  │ Sanitizer  │  │
              │  └─────┬──────┘  │
              │        │         │
              │  ┌─────▼──────┐  │
              │  │ Calibrator │◄─┼── CalibrationRegistry
              │  └─────┬──────┘  │     ├── AlphaCalibration
              │        │         │     ├── BetaCalibration
              │  ┌─────▼──────┐  │     └── DefaultCalibration
              │  │UnitConverter│  │
              │  └─────┬──────┘  │
              │        │         │
              │  ┌─────▼──────┐  │
              │  │ValueRounder│  │
              │  └─────┬──────┘  │
              └────────┼─────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   ProcessedReading  ProcessError  InsightEngine
                                    ├── AlertGenerator
                                    └── StatisticsCalculator
```

## Conclusion

Successfully refactored the monolithic IoT data processor into a modular, strategy-driven pipeline that:

1. Separates concerns into discrete, testable components
2. Uses Strategy Pattern for extensible calibration
3. Maintains mathematical parity with legacy code
4. Provides robust error handling
5. Allows easy addition of new processors (demonstrated with RangeFilter)
6. Supports different sensor profiles with shared normalization logic
