# K7MOMH - reagent-Low-Alert-System

**Category:** sft

## Overview
- Task ID: K7MOMH
- Title: reagent-Low-Alert-System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k7momh-reagent-low-alert-system

## Requirements
- Stock Tracking: Maintain an internal object mapping chemical names to current quantities.
- Alert Threshold: Each chemical has its own unique threshold (e.g., Ethanol at 5.0L).
- Debounce Logic: Maintain a 'last_alerted' timestamp map. Do not queue a notification if the delta is less than 60,000ms.
- Queue Management: The `getQueue()` function must return all active alerts and then clear the list.
- Validation: Ensure quantities cannot become negative.
- Testing Requirement: Simulate three consecutive uses of Ethanol within 10 seconds. Verify only one alert is present in the queue.
- Testing Requirement: Verify that if stock levels for two different chemicals both drop below thresholds, both are correctly added to the queue.

## Metadata
- Programming Languages: JavaScript
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
