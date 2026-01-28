# ETS0DP - Discrete Physics Simulation of Roller Coaster Dynamics with Friction and G-Force Constraints

**Category:** sft

## Overview
- Task ID: ETS0DP
- Title: Discrete Physics Simulation of Roller Coaster Dynamics with Friction and G-Force Constraints
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ets0dp-discrete-physics-simulation-of-roller-coaster-dynamics-with-friction-and-g-force-constraints

## Requirements
- Numerical Integration: The solution must use a loop with a small delta time to update velocity and position incrementally. Using a simple energy formula without iteration is a failure.
- The code must calculate drag force proportional to the square of the current velocity.
- The code must calculate friction based on the current Normal Force, not just static weight.
- The logic must identify when the train is on a circular segment and apply Centripetal Acceleration logic involving velocity squared divided by the radius.
- Gravity Components: On a slope, gravity must be decomposed into parallel acceleration and perpendicular Normal force components using Trigonometry.
- No External Engines: Usage of external physics libraries or game engines is a failure.
- Positive Gs: The report must track the maximum G-force to ensure it does not exceed defined human limits.
- Negative Gs: The report must track minimum G-forces to ensure passengers are not ejected from their seats during airtime hills.

## Metadata
- Programming Languages: Python 3.10+
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
