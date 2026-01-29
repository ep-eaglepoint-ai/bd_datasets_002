# X5HTLV - Latency-Critical Input Hooks with State Management

**Category:** sft

## Overview
- Task ID: X5HTLV
- Title: Latency-Critical Input Hooks with State Management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: x5htlv-latency-critical-input-hooks-with-state-management

## Requirements
- Must use pynput.keyboard.Listener (or mouse).
- Must NOT implement key logging (writing raw inputs to a file or persistent list).
- The on_press callback must be strictly non-blocking (O(1) complexity, no I/O).
- Must use a queue.Queue (or multiprocessing.Queue) to bridge the hook and the logic.
- Must spawn a separate Thread or Process to consume events from the queue.
- Must correctly track modifier state (e.g., knowing Ctrl is held down when P is pressed).
- Must handle on_release events to clear modifier flags in the state machine.
- Must import signal and handle SIGINT (Ctrl+C) gracefully.
- Must explicitly call listener.stop() within the shutdown sequence.
- The listener must be non-suppressing (suppress=False) to allow normal computer usage
- The main program loop must keep the script alive (e.g., listener.join()) without busy-waiting (spinning 100% CPU).

## Metadata
- Programming Languages: Python 3.9+
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
