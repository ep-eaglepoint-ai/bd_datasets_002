# WOJFQV - anomaly-Detection-Watch-dog-satelliteLink

**Category:** sft

## Overview
- Task ID: WOJFQV
- Title: anomaly-Detection-Watch-dog-satelliteLink
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wojfqv-anomaly-detection-watch-dog-satellitelink

## Requirements
- Sliding Window Management: For each unique `linkId`, maintain a FIFO buffer of 200 latency readings. Ensure old samples are evicted as new ones arrive to prevent infinite growth.
- Manual Statistical Implementation: Implement the logic for both the arithmetic mean and the standard deviation (sqrt of variance) natively. Do not rely on external npm packages.
- Detection Threshold: Compare `|Mean(current) - Mean(baseline)|`. If this delta is greater than `2 * StandardDeviation(baseline)`, trigger an anomaly state.
- Warmup Constraint: Return a 'WARMING_UP' status (or equivalent) for any specific `linkId` until exactly 200 pulses have been recorded for it.
- Performance Optimization: Choose data structures (like Map or typed arrays) that ensure O(1) lookups for link IDs and avoid blocking the event loop during heavy statistical computation.
- Zero-Variance Edge Case: Ensure the system handles 'flat' baselines (where all 100 values are identical, making standard deviation 0) safely without producing NaN or throwing errors.
- State Purging: Provide a way to manually reset the state of a single `linkId`, which should return its lifecycle to the 'WARMING_UP' phase.
- Testing Requirement: Write a test where 199 pulses of value `10.0` are sent. Confirm that after the 200th pulse (value `10.0`), the status is stable/nominal. Then, send 5 pulses of `250.0` and verify the anomaly state triggers.
- esting Requirement: Verify that after a `reset` call for a specific ID, the very next pulse for that ID returns the 'WARMING_UP' status.

## Metadata
- Programming Languages: JavaScript, TypeScript
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
