# G6CUN4 - Simulated Precision Time Protocol (PTP) Clock Synchronization Under Extreme Constraints

**Category:** sft

## Overview
- Task ID: G6CUN4
- Title: Simulated Precision Time Protocol (PTP) Clock Synchronization Under Extreme Constraints
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g6cun4-simulated-precision-time-protocol-ptp-clock-synchronization-under-extreme-constraints

## Requirements
- Design and implement a production-style simulation of atomic clock synchronization in a distributed system. The solution must model three independent clocks with deterministic drift, implement a grandmaster-based synchronization protocol, and demonstrate gradual convergence without direct state overwrites. The implementation must operate under strict environmental and structural constraints, including the absence of real-time libraries, manual nanosecond-level tick simulation, controlled frequency adjustment, and non-trivial output encoding using bitwise operations. The system must be deterministic, self-verifying, and suitable for evaluating multi-step reasoning and constraint handling in a restricted runtime environment.

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
