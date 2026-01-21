# WDF0TE - event-loop-multitask-scheduler

**Category:** sft

## Overview
- Task ID: WDF0TE
- Title: event-loop-multitask-scheduler
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wdf0te-event-loop-multitask-scheduler

## Requirements
- Implement a cooperative multitasking scheduler in Python.
- Support multiple concurrent tasks without using threads, multiprocessing, or asyncio.
- Tasks must voluntarily yield control to the scheduler.
- Support task priorities and ensure fair scheduling.
- Handle simulated delays or “sleep” without blocking the scheduler.
- Prevent deadlocks and starvation; tasks can run indefinitely safely.
- Include debugging/logging to track task execution and timing.
- Use memory efficiently; avoid unnecessary objects or lists.
- Gracefully handle task completion and removal from the scheduler.

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
