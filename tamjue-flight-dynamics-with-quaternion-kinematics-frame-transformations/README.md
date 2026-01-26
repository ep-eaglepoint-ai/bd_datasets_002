# TAMJUE - Flight Dynamics with Quaternion Kinematics & Frame Transformations

**Category:** sft

## Overview
- Task ID: TAMJUE
- Title: Flight Dynamics with Quaternion Kinematics & Frame Transformations
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tamjue-flight-dynamics-with-quaternion-kinematics-frame-transformations

## Requirements
- he solution must implement a struct with 4 components (w, x, y, z) to track orientation. Attempting to use Euler Angles (Roll/Pitch/Yaw) is an automatic failure due to the Gimbal Lock constraint.
- The code must explicitly calculate the rotation of the Thrust/Drag vectors (Body Frame) into World Frame coordinates before integrating position.
- Gravity must be applied to the World Y (or Z) axis only. It cannot be rotated; it is a constant global force.
- The update loop must include a mathematical step to normalize the rotation quaternion (         q=q/∣q∣q=q/∣q∣ ) to prevent numerical drift.
- he solution must implement the vector/quaternion math (dot products, cross products, multiplication) using standard math functions.
- The struct holding the physics state must be protected by a sync.RWMutex (or Mutex), ensuring that Update() (Write) and state queries (Read) are safe.

## Metadata
- Programming Languages: Go (Golang) 1.21+
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
