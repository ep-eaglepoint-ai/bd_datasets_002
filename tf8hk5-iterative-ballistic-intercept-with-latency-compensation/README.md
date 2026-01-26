# TF8HK5 - Iterative Ballistic Intercept with Latency Compensation

**Category:** sft

## Overview
- Task ID: TF8HK5
- Title: Iterative Ballistic Intercept with Latency Compensation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tf8hk5-iterative-ballistic-intercept-with-latency-compensation

## Requirements
- The code must implement a loop (or recursive function) to refine the Time-of-Flight calculation. Using a static Distance / Speed formula is an automatic failure.
- The logic must calculate the time delta between the packet's timestamp and Date.now(), and advance the target's position accordingly before solving the intercept.
- The final output coordinates must be different from the current target coordinates (assuming velocity > 0).
- The iterative solver must have a max_iterations break capability to prevent infinite loops if the target is moving away faster than the shell (impossible shot).
- The system must accept input via an EventEmitter (or Stream) and emit results. It cannot be a synchronous function call.
- manual implementation of distance (Euclidean) and velocity vectors is required.
- The logic must compare the required azimuth change against a defined degrees_per_second limit of the turret.
- Input data validation is required (checking for nulls or NaNs in the radar stream) to prevent the math engine from crashing the process.

## Metadata
- Programming Languages: Node.js
- Frameworks: (none)
- Libraries: events (EventEmitter), worker_threads (optional but good). (Forbidden: mathjs, external physics engines).
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
