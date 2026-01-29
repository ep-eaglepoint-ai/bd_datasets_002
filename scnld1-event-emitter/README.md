# SCNLD1 - event emitter

**Category:** sft

## Overview
- Task ID: SCNLD1
- Title: event emitter
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: scnld1-event-emitter

## Requirements
- The `on(event_name, callback)` method must register a callback for an event. The `emit(event_name, *args, **kwargs)` method must call all registered callbacks with the provided arguments. Multiple callbacks per event must be supported and called in registration order.
- The `once(event_name, callback)` method must register a callback that is automatically removed after being called once. The callback should receive the same arguments as regular listeners.
- The `off(event_name, callback)` method must remove a specific callback from an event. The `off(event_name)` variant (no callback) must remove all listeners for that event. The `remove_all_listeners()` method must clear all events.
- The `listeners(event_name)` method must return a list of callbacks for an event. The `event_names()` method must return all event names with registered listeners. The `listener_count(event_name)` must return the count of listeners for an event.

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
