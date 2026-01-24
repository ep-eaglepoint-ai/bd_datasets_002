# 3QVYKF - FIFO Fair Semaphore with Dynamic Resizing and Timeout Cleanup

**Category:** sft

## Overview
- Task ID: 3QVYKF
- Title: FIFO Fair Semaphore with Dynamic Resizing and Timeout Cleanup
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3qvykf-fifo-fair-semaphore-with-dynamic-resizing-and-timeout-cleanup

## Requirements
- The implementation must utilize an internal queue (e.g., deque) to track waiting threads and ensure that release() wakes up the head of the line, not a random thread (verifiable by thread start/end timestamps)
- If a thread times out inside acquire, it must remove itself from the waiting queue. Failure to do so (leaving a "ghost" entry) causes the next release to notify a dead thread, hanging the system.
- The model must use threading.Lock and threading.Condition manually. Using the built-in Queue library is an automatic fail as it bypasses the reasoning challenge
- The resize method must correctly handle reducing capacity. If current usage > new capacity, the system must block new acquire calls until the count drops naturally (it cannot force-kill active threads)
- The code must handle the "check-then-act" race condition where a timeout happens simultaneously with a notify. The resource count must remain accurate
- The circular buffer for get_average_wait_time must be implemented with O(1) updates (not resizing a list constantly) and must be thread-safe.
- The solution must use wait() logic. Solutions that use while True: sleep(0.01) (spin-locking) are invalid due to CPU inefficiency.

## Metadata
- Programming Languages: Python 3.10+
- Frameworks: (none)
- Libraries: threading, collections, time. (Forbidden: queue.Queue
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
