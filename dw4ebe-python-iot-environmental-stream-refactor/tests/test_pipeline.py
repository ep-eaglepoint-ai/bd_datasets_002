"""
Test suite for TerraSense IoT Data Processing Pipeline

Tests cover all 7 requirements:
1. Pipeline Architecture Implementation
2. Strategy Pattern for Sensor Models
3. Mathematical Parity and Precision
4. Separation of Analysis and Normalization
5. Input Resilience
6. Testing Requirement (Parity) - Beta CO2 sensor
7. Testing Requirement (Extensibility) - RangeFilter
"""

import math
import pytest
import sys
import os

# Determine which repository to test based on environment variable
REPO_UNDER_TEST = os.environ.get('REPO_UNDER_TEST', 'repository_after')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', REPO_UNDER_TEST))

from process_sensor_data import process_telemetry_batch

# Try to import refactored components (only available in repository_after)
try:
    from process_sensor_data import (
        SensorReading,
        ProcessedReading,
        ProcessError,
        PipelineContext,
        CalibrationStrategy,
        AlphaCalibration,
        BetaCalibration,
        DefaultCalibration,
        CalibrationRegistry,
        Processor,
        Sanitizer,
        Calibrator,
        UnitConverter,
        RangeFilter,
        ValueRounder,
        Pipeline,
        create_default_pipeline,
        create_pipeline_with_range_filter,
        AlertGenerator,
        StatisticsCalculator,
        InsightEngine,
        SensorProfile,
        create_industrial_profile,
        create_consumer_profile,
    )
    HAS_REFACTORED_COMPONENTS = True
except ImportError:
    HAS_REFACTORED_COMPONENTS = False


# =============================================================================
# REQUIREMENT 1: Pipeline Architecture Implementation
# =============================================================================

class TestPipelineArchitecture:
    """Tests for discrete, interchangeable Processor classes."""

    def test_pipeline_executes_processors_in_sequence(self):
        """Verify processors execute in configured order."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        execution_order = []

        class TrackerProcessor(Processor):
            def __init__(self, name):
                self.name = name

            def process(self, context):
                execution_order.append(self.name)
                return context

        pipeline = Pipeline([
            TrackerProcessor('first'),
            TrackerProcessor('second'),
            TrackerProcessor('third'),
        ])

        reading = SensorReading(id='S1', model='Alpha', value=25.0, sensor_type='temp')
        pipeline.process(reading)

        assert execution_order == ['first', 'second', 'third']

    def test_sanitizer_processor_validates_input(self):
        """Sanitizer should validate input data."""
        assert HAS_REFACTORED_COMPONENTS, "Sanitizer class not found - refactoring required"

        sanitizer = Sanitizer()
        reading = SensorReading(id='S1', model='Alpha', value=25.0, sensor_type='temp')
        context = PipelineContext(reading=reading, current_value=reading.value)

        result = sanitizer.process(context)

        assert not result.skip
        assert len(result.errors) == 0

    def test_calibrator_processor_applies_calibration(self):
        """Calibrator should apply model-specific calibration."""
        assert HAS_REFACTORED_COMPONENTS, "Calibrator class not found - refactoring required"

        calibrator = Calibrator()
        reading = SensorReading(id='S1', model='Alpha', value=25.0, sensor_type='temp')
        context = PipelineContext(reading=reading, current_value=reading.value)

        result = calibrator.process(context)

        assert result.current_value == 23.5  # 25.0 - 1.5

    def test_unit_converter_processor_converts_fahrenheit(self):
        """UnitConverter should convert F to C."""
        assert HAS_REFACTORED_COMPONENTS, "UnitConverter class not found - refactoring required"

        converter = UnitConverter()
        reading = SensorReading(id='S1', model='Alpha', value=32.0, sensor_type='temp', unit='F')
        context = PipelineContext(reading=reading, current_value=reading.value)

        result = converter.process(context)

        assert result.current_value == 0.0  # 32F = 0C

    def test_pipeline_can_add_processors_dynamically(self):
        """Pipeline should support dynamic processor addition."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        pipeline = Pipeline()
        pipeline.add(Sanitizer()).add(Calibrator()).add(UnitConverter())

        reading = SensorReading(id='S1', model='Alpha', value=25.0, sensor_type='temp')
        result, errors = pipeline.process(reading)

        assert result is not None
        assert result.normalized_value == 23.5

    def test_pipeline_processes_batch(self):
        """Pipeline should process batch of readings."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        pipeline = create_default_pipeline()

        raw_readings = [
            {'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},
            {'id': 'S2', 'model': 'Beta', 'val': 30.0, 'type': 'temp', 'unit': 'C'},
        ]

        results, errors = pipeline.process_batch(raw_readings)

        assert len(results) == 2
        assert len(errors) == 0


# =============================================================================
# REQUIREMENT 2: Strategy Pattern for Sensor Models
# =============================================================================

class TestStrategyPattern:
    """Tests for CalibrationRegistry and Strategy objects."""

    def test_alpha_calibration_subtracts_1_5(self):
        """Alpha calibration: val = val - 1.5."""
        assert HAS_REFACTORED_COMPONENTS, "AlphaCalibration class not found - refactoring required"

        strategy = AlphaCalibration()
        result = strategy.calibrate(25.0, 'temp')
        assert result == 23.5

    def test_beta_calibration_co2_logarithmic(self):
        """Beta CO2 calibration: val = log10(val) * 10."""
        assert HAS_REFACTORED_COMPONENTS, "BetaCalibration class not found - refactoring required"

        strategy = BetaCalibration()
        result = strategy.calibrate(100.0, 'co2')
        assert result == 20.0  # log10(100) * 10 = 2 * 10 = 20

    def test_beta_calibration_co2_zero_handled(self):
        """Beta CO2 calibration handles zero/negative values."""
        assert HAS_REFACTORED_COMPONENTS, "BetaCalibration class not found - refactoring required"

        strategy = BetaCalibration()
        assert strategy.calibrate(0, 'co2') == 0
        assert strategy.calibrate(-10, 'co2') == 0

    def test_beta_calibration_non_co2_adds_0_8(self):
        """Beta non-CO2 calibration: val = val + 0.8."""
        assert HAS_REFACTORED_COMPONENTS, "BetaCalibration class not found - refactoring required"

        strategy = BetaCalibration()
        result = strategy.calibrate(25.0, 'temp')
        assert result == 25.8

    def test_default_calibration_no_change(self):
        """Default calibration makes no changes."""
        assert HAS_REFACTORED_COMPONENTS, "DefaultCalibration class not found - refactoring required"

        strategy = DefaultCalibration()
        result = strategy.calibrate(25.0, 'temp')
        assert result == 25.0

    def test_registry_returns_correct_strategy(self):
        """Registry returns correct strategy for model."""
        assert HAS_REFACTORED_COMPONENTS, "CalibrationRegistry class not found - refactoring required"

        registry = CalibrationRegistry()

        assert isinstance(registry.get('Alpha'), AlphaCalibration)
        assert isinstance(registry.get('Beta'), BetaCalibration)
        assert isinstance(registry.get('Unknown'), DefaultCalibration)

    def test_registry_allows_new_model_registration(self):
        """Registry allows adding new sensor models."""
        assert HAS_REFACTORED_COMPONENTS, "CalibrationRegistry class not found - refactoring required"

        class GammaCalibration(CalibrationStrategy):
            def calibrate(self, value, sensor_type):
                return value * 2

        registry = CalibrationRegistry()
        registry.register('Gamma', GammaCalibration())

        result = registry.calibrate('Gamma', 10.0, 'temp')
        assert result == 20.0

    def test_adding_new_model_does_not_modify_existing(self):
        """Adding new model doesn't affect existing strategies."""
        assert HAS_REFACTORED_COMPONENTS, "CalibrationRegistry class not found - refactoring required"

        class GammaCalibration(CalibrationStrategy):
            def calibrate(self, value, sensor_type):
                return value * 2

        registry = CalibrationRegistry()
        registry.register('Gamma', GammaCalibration())

        # Existing strategies still work
        assert registry.calibrate('Alpha', 25.0, 'temp') == 23.5
        assert registry.calibrate('Beta', 100.0, 'co2') == 20.0


# =============================================================================
# REQUIREMENT 3: Mathematical Parity and Precision
# =============================================================================

class TestMathematicalParity:
    """Tests for identical results with legacy and 2 decimal precision."""

    def test_alpha_temp_parity(self):
        """Alpha temp: 25.0 -> 23.5 (val - 1.5)."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}
        ])
        assert result['data'][0]['normalized_value'] == 23.5

    def test_beta_temp_parity(self):
        """Beta temp: 25.0 -> 25.8 (val + 0.8)."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Beta', 'val': 25.0, 'type': 'temp', 'unit': 'C'}
        ])
        assert result['data'][0]['normalized_value'] == 25.8

    def test_beta_co2_parity(self):
        """Beta CO2: 100.0 -> 20.0 (log10(100) * 10)."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Beta', 'val': 100.0, 'type': 'co2', 'unit': 'ppm'}
        ])
        assert result['data'][0]['normalized_value'] == 20.0

    def test_fahrenheit_to_celsius_conversion(self):
        """F to C with calibration: Alpha calibration first, then F->C conversion."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': 68.0, 'type': 'temp', 'unit': 'F'}
        ])
        # Legacy order: calibration FIRST, then F->C conversion
        # Step 1: Alpha calibration: 68 - 1.5 = 66.5
        # Step 2: F to C: (66.5 - 32) * 5/9 = 19.166... -> 19.17
        assert result['data'][0]['normalized_value'] == 19.17

    def test_two_decimal_precision(self):
        """All values rounded to exactly 2 decimal places."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Beta', 'val': 1000.0, 'type': 'co2', 'unit': 'ppm'}
        ])
        # log10(1000) * 10 = 30.0
        value = result['data'][0]['normalized_value']
        assert value == round(value, 2)

    def test_average_calculation_parity(self):
        """Average calculation matches legacy."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': 24.0, 'type': 'temp', 'unit': 'C'},
            {'id': 'S2', 'model': 'Alpha', 'val': 26.0, 'type': 'temp', 'unit': 'C'},
        ])
        # 24-1.5=22.5, 26-1.5=24.5, avg=23.5
        assert result['summary']['average'] == 23.5
        assert result['summary']['count'] == 2


# =============================================================================
# REQUIREMENT 4: Separation of Analysis and Normalization
# =============================================================================

class TestSeparationOfConcerns:
    """Tests for decoupled InsightEngine."""

    def test_pipeline_returns_clean_data_only(self):
        """Pipeline returns only normalized data, not alerts."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        pipeline = create_default_pipeline()
        raw = [{'id': 'S1', 'model': 'Alpha', 'val': 60.0, 'type': 'temp', 'unit': 'C'}]

        results, errors = pipeline.process_batch(raw)

        # Pipeline returns ProcessedReading objects
        assert len(results) == 1
        assert isinstance(results[0], ProcessedReading)
        # No alert generation in pipeline

    def test_alert_generator_creates_heat_alerts(self):
        """AlertGenerator creates CRITICAL_HEAT alerts."""
        assert HAS_REFACTORED_COMPONENTS, "AlertGenerator class not found - refactoring required"

        generator = AlertGenerator(temp_max_c=55.0)

        results = [ProcessedReading(
            sensor_id='S1',
            normalized_value=60.0,
            timestamp='2024-01-01T00:00:00',
            sensor_type='temp'
        )]

        alerts = generator.generate(results)

        assert len(alerts) == 1
        assert 'CRITICAL_HEAT' in alerts[0]
        assert 'S1' in alerts[0]

    def test_alert_generator_creates_dry_soil_alerts(self):
        """AlertGenerator creates DRY_SOIL alerts."""
        assert HAS_REFACTORED_COMPONENTS, "AlertGenerator class not found - refactoring required"

        generator = AlertGenerator(moisture_min=10.0)

        results = [ProcessedReading(
            sensor_id='S1',
            normalized_value=5.0,
            timestamp='2024-01-01T00:00:00',
            sensor_type='moisture'
        )]

        alerts = generator.generate(results)

        assert len(alerts) == 1
        assert 'DRY_SOIL' in alerts[0]

    def test_statistics_calculator_computes_average(self):
        """StatisticsCalculator computes correct average."""
        assert HAS_REFACTORED_COMPONENTS, "StatisticsCalculator class not found - refactoring required"

        calculator = StatisticsCalculator()

        results = [
            ProcessedReading(sensor_id='S1', normalized_value=20.0, timestamp='', sensor_type='temp'),
            ProcessedReading(sensor_id='S2', normalized_value=30.0, timestamp='', sensor_type='temp'),
        ]

        stats = calculator.calculate(results)

        assert stats['average'] == 25.0
        assert stats['count'] == 2

    def test_statistics_calculator_handles_empty(self):
        """StatisticsCalculator handles empty results."""
        assert HAS_REFACTORED_COMPONENTS, "StatisticsCalculator class not found - refactoring required"

        calculator = StatisticsCalculator()
        stats = calculator.calculate([])

        assert stats['average'] == 0
        assert stats['count'] == 0

    def test_insight_engine_combines_alerts_and_stats(self):
        """InsightEngine provides unified analysis interface."""
        assert HAS_REFACTORED_COMPONENTS, "InsightEngine class not found - refactoring required"

        engine = InsightEngine()

        results = [
            ProcessedReading(sensor_id='S1', normalized_value=60.0, timestamp='', sensor_type='temp'),
            ProcessedReading(sensor_id='S2', normalized_value=5.0, timestamp='', sensor_type='moisture'),
        ]

        insights = engine.analyze(results)

        assert 'alerts' in insights
        assert 'summary' in insights
        assert len(insights['alerts']) == 2  # Heat + dry soil


# =============================================================================
# REQUIREMENT 5: Input Resilience
# =============================================================================

class TestInputResilience:
    """Tests for handling malformed data."""

    def test_missing_val_key_continues_processing(self):
        """Missing 'val' key logs error and continues."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'type': 'temp'},  # Missing val
            {'id': 'S2', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},
        ])

        assert len(result['data']) == 1
        assert result['data'][0]['sensor_id'] == 'S2'

    def test_null_val_continues_processing(self):
        """Null 'val' logs error and continues."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': None, 'type': 'temp'},
            {'id': 'S2', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},
        ])

        assert len(result['data']) == 1

    def test_invalid_val_type_continues_processing(self):
        """Invalid 'val' type logs error and continues."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': 'not_a_number', 'type': 'temp'},
            {'id': 'S2', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},
        ])

        assert len(result['data']) == 1

    def test_pipeline_records_process_errors(self):
        """Pipeline records ProcessError for malformed data."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        pipeline = create_default_pipeline()

        raw = [
            {'id': 'S1', 'val': None, 'model': 'Alpha', 'type': 'temp'},
            {'id': 'S2', 'val': 25.0, 'model': 'Alpha', 'type': 'temp', 'unit': 'C'},
        ]

        results, errors = pipeline.process_batch(raw)

        assert len(results) == 1
        assert len(errors) == 1
        assert isinstance(errors[0], ProcessError)

    def test_batch_does_not_fail_on_single_error(self):
        """Entire batch doesn't fail due to single malformed record."""
        result = process_telemetry_batch([
            {'id': 'S1', 'val': 'bad'},
            {'id': 'S2', 'val': None},
            {'id': 'S3', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},
            {},  # Empty dict
        ])

        assert len(result['data']) == 1
        assert result['data'][0]['sensor_id'] == 'S3'

    def test_empty_batch_returns_empty_stats(self):
        """Empty batch returns proper structure."""
        result = process_telemetry_batch([])

        assert result == {'data': [], 'stats': {'avg': 0}}

    def test_all_invalid_returns_empty_stats(self):
        """All invalid records returns empty stats."""
        result = process_telemetry_batch([
            {'id': 'S1', 'val': None},
            {'id': 'S2', 'val': 'bad'},
        ])

        assert result == {'data': [], 'stats': {'avg': 0}}


# =============================================================================
# REQUIREMENT 6: Testing Requirement (Parity) - Beta CO2 Sensor
# =============================================================================

class TestBetaCO2Parity:
    """Specific test for Beta model CO2 sensor returning 20.0 for input 100.0."""

    def test_beta_co2_value_100_returns_20(self):
        """
        REQUIREMENT 6: Beta CO2 sensor value=100.0 -> normalized=20.0

        Calculation: log10(100) * 10 = 2 * 10 = 20.0
        """
        result = process_telemetry_batch([
            {'id': 'CO2_SENSOR', 'model': 'Beta', 'val': 100.0, 'type': 'co2', 'unit': 'ppm'}
        ])

        assert len(result['data']) == 1
        assert result['data'][0]['normalized_value'] == 20.0

    def test_beta_co2_direct_strategy_calculation(self):
        """Verify Beta CO2 calibration math directly."""
        assert HAS_REFACTORED_COMPONENTS, "BetaCalibration class not found - refactoring required"

        strategy = BetaCalibration()
        result = strategy.calibrate(100.0, 'co2')

        assert result == math.log10(100.0) * 10
        assert result == 20.0

    def test_beta_co2_through_registry(self):
        """Verify Beta CO2 through CalibrationRegistry."""
        assert HAS_REFACTORED_COMPONENTS, "CalibrationRegistry class not found - refactoring required"

        registry = CalibrationRegistry()
        result = registry.calibrate('Beta', 100.0, 'co2')

        assert result == 20.0


# =============================================================================
# REQUIREMENT 7: Testing Requirement (Extensibility) - RangeFilter
# =============================================================================

class TestRangeFilterExtensibility:
    """Demonstrate RangeFilter can be added without changing existing classes."""

    def test_range_filter_rejects_below_minimum(self):
        """RangeFilter rejects values below minimum."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        filter = RangeFilter(min_value=0.0)
        reading = SensorReading(id='S1', model='Alpha', value=-10.0, sensor_type='temp')
        context = PipelineContext(reading=reading, current_value=-10.0)

        result = filter.process(context)

        assert result.skip is True
        assert any('below minimum' in e for e in result.errors)

    def test_range_filter_rejects_above_maximum(self):
        """RangeFilter rejects values above maximum."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        filter = RangeFilter(max_value=100.0)
        reading = SensorReading(id='S1', model='Alpha', value=150.0, sensor_type='temp')
        context = PipelineContext(reading=reading, current_value=150.0)

        result = filter.process(context)

        assert result.skip is True
        assert any('above maximum' in e for e in result.errors)

    def test_range_filter_accepts_within_range(self):
        """RangeFilter accepts values within range."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        filter = RangeFilter(min_value=0.0, max_value=100.0)
        reading = SensorReading(id='S1', model='Alpha', value=50.0, sensor_type='temp')
        context = PipelineContext(reading=reading, current_value=50.0)

        result = filter.process(context)

        assert result.skip is False
        assert len(result.errors) == 0

    def test_range_filter_added_to_pipeline_without_modification(self):
        """RangeFilter integrates without modifying existing processors."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        pipeline = create_pipeline_with_range_filter(min_value=0.0, max_value=50.0)

        raw = [
            {'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'},  # 23.5 after calibration
            {'id': 'S2', 'model': 'Alpha', 'val': 60.0, 'type': 'temp', 'unit': 'C'},  # 58.5 after calibration - rejected
        ]

        results, errors = pipeline.process_batch(raw)

        assert len(results) == 1
        assert results[0].sensor_id == 'S1'
        assert len(errors) == 1

    def test_existing_calibration_unchanged_with_range_filter(self):
        """Adding RangeFilter doesn't affect calibration logic."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        pipeline = create_pipeline_with_range_filter(min_value=-100.0, max_value=100.0)

        raw = [{'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}]
        results, _ = pipeline.process_batch(raw)

        # Alpha calibration still works: 25.0 - 1.5 = 23.5
        assert results[0].normalized_value == 23.5

    def test_existing_conversion_unchanged_with_range_filter(self):
        """Adding RangeFilter doesn't affect unit conversion."""
        assert HAS_REFACTORED_COMPONENTS, "RangeFilter class not found - refactoring required"

        pipeline = create_pipeline_with_range_filter(min_value=-100.0, max_value=100.0)

        raw = [{'id': 'S1', 'model': 'Alpha', 'val': 68.0, 'type': 'temp', 'unit': 'F'}]
        results, _ = pipeline.process_batch(raw)

        # Legacy order: calibration FIRST, then F->C conversion
        # Step 1: Alpha calibration: 68 - 1.5 = 66.5
        # Step 2: F to C: (66.5 - 32) * 5/9 = 19.166... -> 19.17
        assert results[0].normalized_value == 19.17


# =============================================================================
# SENSOR PROFILES
# =============================================================================

class TestSensorProfiles:
    """Test profile-based pipeline configuration."""

    def test_industrial_profile_processes_correctly(self):
        """Industrial profile processes data correctly."""
        assert HAS_REFACTORED_COMPONENTS, "SensorProfile class not found - refactoring required"

        profile = create_industrial_profile()

        raw = [{'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}]
        results, _ = profile.pipeline.process_batch(raw)

        assert len(results) == 1
        assert results[0].normalized_value == 23.5

    def test_consumer_profile_processes_correctly(self):
        """Consumer profile processes data correctly."""
        assert HAS_REFACTORED_COMPONENTS, "SensorProfile class not found - refactoring required"

        profile = create_consumer_profile()

        raw = [{'id': 'S1', 'model': 'Beta', 'val': 100.0, 'type': 'co2', 'unit': 'ppm'}]
        results, _ = profile.pipeline.process_batch(raw)

        assert len(results) == 1
        assert results[0].normalized_value == 20.0

    def test_profiles_share_normalization_different_calibration(self):
        """Different profiles can share normalization but have different calibration."""
        assert HAS_REFACTORED_COMPONENTS, "SensorProfile class not found - refactoring required"

        # Custom calibration for consumer profile
        class ConsumerAlphaCalibration(CalibrationStrategy):
            def calibrate(self, value, sensor_type):
                return value - 2.0  # Different offset

        consumer_registry = CalibrationRegistry()
        consumer_registry.register('Alpha', ConsumerAlphaCalibration())
        consumer_profile = create_consumer_profile(consumer_registry)

        # Industrial uses default Alpha calibration
        industrial_profile = create_industrial_profile()

        raw = [{'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}]

        industrial_results, _ = industrial_profile.pipeline.process_batch(raw)
        consumer_results, _ = consumer_profile.pipeline.process_batch(raw)

        # Industrial: 25 - 1.5 = 23.5
        assert industrial_results[0].normalized_value == 23.5
        # Consumer: 25 - 2.0 = 23.0
        assert consumer_results[0].normalized_value == 23.0


# =============================================================================
# THREAD SAFETY
# =============================================================================

class TestThreadSafety:
    """Test thread safety of stateless components."""

    def test_pipeline_is_stateless(self):
        """Pipeline processes multiple readings independently."""
        assert HAS_REFACTORED_COMPONENTS, "Pipeline class not found - refactoring required"

        pipeline = create_default_pipeline()

        raw1 = [{'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}]
        raw2 = [{'id': 'S2', 'model': 'Beta', 'val': 100.0, 'type': 'co2', 'unit': 'ppm'}]

        results1, _ = pipeline.process_batch(raw1)
        results2, _ = pipeline.process_batch(raw2)

        # Each batch processed independently
        assert results1[0].normalized_value == 23.5
        assert results2[0].normalized_value == 20.0

    def test_calibration_strategies_are_stateless(self):
        """Calibration strategies don't maintain state."""
        assert HAS_REFACTORED_COMPONENTS, "BetaCalibration class not found - refactoring required"

        strategy = BetaCalibration()

        # Multiple calls with different values
        assert strategy.calibrate(100.0, 'co2') == 20.0
        assert strategy.calibrate(1000.0, 'co2') == 30.0
        assert strategy.calibrate(100.0, 'co2') == 20.0  # Same result


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestIntegration:
    """End-to-end integration tests."""

    def test_full_batch_processing(self):
        """Full batch with mixed sensors."""
        result = process_telemetry_batch([
            {'id': 'T1', 'model': 'Alpha', 'val': 60.0, 'type': 'temp', 'unit': 'C'},
            {'id': 'T2', 'model': 'Beta', 'val': 100.0, 'type': 'co2', 'unit': 'ppm'},
            {'id': 'M1', 'model': 'Alpha', 'val': 5.0, 'type': 'moisture', 'unit': '%'},
            {'id': 'BAD', 'val': None},  # Invalid
        ])

        assert len(result['data']) == 3
        assert 'CRITICAL_HEAT' in result['alerts'][0]  # T1: 60-1.5=58.5 > 55
        assert 'DRY_SOIL' in result['alerts'][1]  # M1: 5-1.5=3.5 < 10

    def test_legacy_function_compatibility(self):
        """process_telemetry_batch maintains legacy interface."""
        result = process_telemetry_batch([
            {'id': 'S1', 'model': 'Alpha', 'val': 25.0, 'type': 'temp', 'unit': 'C'}
        ])

        # Legacy response structure
        assert 'data' in result
        assert 'alerts' in result
        assert 'summary' in result
        assert 'average' in result['summary']
        assert 'count' in result['summary']

        # Legacy data structure
        assert 'sensor_id' in result['data'][0]
        assert 'normalized_value' in result['data'][0]
        assert 'timestamp' in result['data'][0]
