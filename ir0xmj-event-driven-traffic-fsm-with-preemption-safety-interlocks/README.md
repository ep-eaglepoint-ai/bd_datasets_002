# IR0XMJ - Event-Driven Traffic FSM with Preemption & Safety Interlocks

**Category:** sft

## Overview
- Task ID: IR0XMJ
- Title: Event-Driven Traffic FSM with Preemption & Safety Interlocks
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ir0xmj-event-driven-traffic-fsm-with-preemption-safety-interlocks

## Requirements
- Strict Phase Sequence: The controller must follow Green -> Yellow -> All-Red -> Red. Skipping Yellow or All-Red is an automatic Fail.
- The test suite will query the state every 10ms. If Main_Green and Side_Green (or Yellow) are true simultaneously, the safety check fails.
- Even if traffic drops to 0, the light must stay Green for min_green_time. Switching immediately is a failure (Dilemma Zone protection).
- When trigger_emergency() is called, the current Green must transition to Yellow -> Red before the Emergency Green activates. Instant switching is a failure.
- When the emergency signal clears, the system must resume normal operation. Getting stuck in the Emergency state is a deadlock failure.
- If traffic is continuous on both sides, the light must eventually switch (preventing starvation) based on max_green_time.
- Sensor updates (update_density) must be thread-safe and affect the next logic cycle without race conditions.
- There must be a specific state or timer duration where all lights are Red between phases.
- The code should utilize Enum or a specific State pattern. Spaghetti if/else chains with loose variables often fail the state retention tests.

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
