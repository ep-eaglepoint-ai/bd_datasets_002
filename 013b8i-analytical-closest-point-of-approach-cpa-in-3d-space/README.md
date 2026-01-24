# 013B8I - Analytical Closest Point of Approach (CPA) in 3D Space

**Category:** sft

## Overview
- Task ID: 013B8I
- Title: Analytical Closest Point of Approach (CPA) in 3D Space
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 013b8i-analytical-closest-point-of-approach-cpa-in-3d-space

## Requirements
- The code must solve for time t using the formula: t = - (RelativePosition . RelativeVelocity) / (|RelativeVelocity|^2)
- Time complexity must be O(1). Any for loop that simulates time steps is a critical failure.
- If |RelativeVelocity|^2 is 0 (parallel flying same speed) or extremely close to 0, the code must guard against division by zero.
- If the calculated t is negative (meaning the closest point was in the past and they are now flying away), the function must clamp t to 0 or correctly identify that no future threat exists.
- The struct and methods must not rely on shared mutable state (globals or internal struct fields modified during calculation).
- After solving for t, the code must calculate the exact positions of both aircraft at that specific time instance (           Pnew=Pinitial+V×tPnew​=Pinitial​+V×t          ) to determine the actual minimum separation distance. Relying solely on t without computing the physical distance is a failure.
- The calculated CPA time t must be compared against the Lookahead Horizon. If t > Horizon, the system must classify the event as non-threatening (or a lower threat level), even if a collision course is detected in the distant future

## Metadata
- Programming Languages: Go (Golang 1.18+)
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
