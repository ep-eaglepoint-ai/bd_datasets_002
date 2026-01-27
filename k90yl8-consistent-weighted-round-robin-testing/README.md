# K90YL8 - consistent-Weighted-Round-Robin-testing

**Category:** sft

## Overview
- Task ID: K90YL8
- Title: consistent-Weighted-Round-Robin-testing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k90yl8-consistent-weighted-round-robin-testing

## Requirements
- Achieve 100% statement and branch coverage for the `GetNextNode` and `UpdateWeights` logic.
- "Implement a 'Sequence Continuity' test: Start with weights [A:2, B:2], call `GetNextNode` twice, then call `UpdateWeights` to [A:10, B:2]. Verify the exact sequence of the next 12 calls matches the expected interleaved output without skipping turns.
- Implement a 'GCD Flux' test: Transition from weights {10, 20} (GCD 10) to weights {7, 13} (GCD 1). Verify that the `currentWeight` decrement logic adapts correctly without causing an out-of-bounds index or infinite loop.
- Validate 'Fairness under Health Flaps': Simulate a scenario where the heaviest node toggles `Healthy: false` and then `Healthy: true` mid-cycle. Verify that it regains its proportional share exactly as specified by the algorithm.
- Concurrency & Race Detection: Execute 1,000 concurrent `GetNextNode` calls while simultaneously firing 50 `UpdateWeights` calls. The test must pass with the Go `-race` detector enabled.
- Adversarial Case: Test with weights of [0, 0, 0] and verify the balancer returns an empty string and does not hang.
- Boundary Test: Verify behavior when the `currentIndex` is at the end of the slice (n-1) and the slice size is reduced via `UpdateWeights`.
- Testing Requirement: Use sub-tests (`t.Run`) to isolate the 'Static Distribution' tests from 'Dynamic Transition' tests.
- Testing Requirement: Provide a 'Sequence Auditor' helper in your tests that records the output of 1,000 calls and verifies the final distribution ratio against a 1% tolerance.

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
