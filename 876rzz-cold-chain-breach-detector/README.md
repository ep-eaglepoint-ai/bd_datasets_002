# 876RZZ - cold-Chain-Breach-Detector

**Category:** sft

## Overview
- Task ID: 876RZZ
- Title: cold-Chain-Breach-Detector
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 876rzz-cold-chain-breach-detector

## Requirements
- Sliding Window Accumulator: For each shipment, track temperature intervals. Calculate the time elapsed between consecutive readings where the value was > 8.0°C and add it to the cumulative total for that 24-hour window.
- Timeline Integrity: Implement logic to handle late-arriving data. If a reading for T=10 arrives after T=20, the system must re-calculate the duration for the affected segments within the 24-hour window.
- Memory Optimization: Automatically purge readings older than 24 hours from memory to prevent leaks, while ensuring the cumulative 'Time-Above-Threshold' is updated correctly as old breaches exit the window.
- Breach Alerting: Immediately return a 'Compromised' status the moment the 1800-second threshold is crossed. This check must be performed on every new incoming data pulse.
- Precision: Use `time.Duration` for all calculations to avoid floating-point errors in time representation.
- Testing Requirement (Cumulative Logic): Submit three 15-minute spikes separated by 2 hours of 'Safe' temperatures. Verify that the third spike triggers the 'COMPROMISED' status once it has been active for 1 second.
- Testing Requirement (Window Exit): Verify that a 40-minute spike that happened 25 hours ago is correctly ignored, and the shipment status returns to 'SAFE' if no other breaches exist in the current 24-hour window.

## Metadata
- Programming Languages: Go
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
