# DW4EBE - python-iot-environmental-stream-refactor

**Category:** sft

## Overview
- Task ID: DW4EBE
- Title: python-iot-environmental-stream-refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dw4ebe-python-iot-environmental-stream-refactor

## Requirements
- Pipeline Architecture Implementation: Refactor the monolithic process_telemetry_batch function into a series of discrete, interchangeable 'Processor' classes or functions (e.g., Sanitizer, Calibrator, UnitConverter). The orchestrator must execute these in a configurable sequence.
- Strategy Pattern for Sensor Models: Replace the hardcoded if-elif calibration logic with a 'CalibrationRegistry' or Strategy objects. This must allow adding a new sensor model (e.g., 'Gamma') by defining a new strategy without modifying the core loop.
- Mathematical Parity and Precision: The refactored logic for unit conversion and calibration must produce results identical to the legacy script. All final numerical values must be rounded to exactly two decimal places for database consistency.
- Separation of Analysis and Normalization: Decouple the alert generation and summary statistics from the data transformation layer. The normalization pipeline should return a cleaned dataset, which is then passed to a separate 'InsightEngine'.
- Input Resilience: The pipeline must handle malformed data (missing keys or invalid types) by recording a 'ProcessError' log and continuing with the next record, rather than failing the entire batch.
- Testing Requirement (Parity): Write a test case for a 'Beta' model CO2 sensor reporting a value of 100.0. Verify the refactored system returns a normalized value of 20.0 (log10(100)*10).
- Testing Requirement (Extensibility): Demonstrate modularity by adding a 'RangeFilter' to the pipeline that rejects values outside a specific min/max range. Verify this can be added without changing the existing calibration or conversion classes.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
