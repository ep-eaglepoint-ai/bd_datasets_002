# 4MGC7F - skyDeliver-Collision-Avoidance-Core

**Category:** sft

## Overview
- Task ID: 4MGC7F
- Title: skyDeliver-Collision-Avoidance-Core
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4mgc7f-skydeliver-collision-avoidance-core

## Requirements
- Projection Logic: Predict drone positions 10 seconds into the future using the current velocity vectors: P_future = P_current + (Velocity * 10).
- Collision Detection: Calculate the Euclidean distance between all drone pairs. A conflict exists if the distance is < 5.0 meters at any time 't' (0 < t <= 10).
- Priority Resolution: Compare battery levels for every conflicting pair. The 'Higher Battery' drone receives an 'ADJUST_ALTITUDE' command.
- Spatial Adjustment: The adjusted drone should change its Z value by +/- 2.0 meters. The direction (Up or Down) must be chosen based on which direction results in a larger separation from the 'Priority' drone's path.
- Concurrency & Performance: The `ResolveConflicts` function must return within 20ms for a set of 100 drones. Use concurrent execution patterns where appropriate.
- Non-Cascading Updates: If adjusting a drone's Z-axis to avoid Drone B creates a new conflict with Drone C, the system must iterate or calculate a valid 'safe' Z value for the entire group.
- Output Format: Return a slice of `Instruction` objects for all drones provided in the input, even if the action is 'MAINTAIN'.
- Testing Requirement: Write a 'Convergence' test: Two drones are at [0,0,10] and [10,0,10] flying toward [5,0,10] (vx=0.5, vx=-0.5). Verify only one drone adjusts altitude and the resulting instruction includes a Z value of 8 or 12.
- Testing Requirement: Use a stress test with 100 drones and the Go '-race' detector to verify that the 20ms threshold is met without memory race conditions.

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
