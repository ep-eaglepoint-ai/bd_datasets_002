# 3N7T95 - Driver Trip Event Processor with Safe State Transitions (Go)

**Category:** sft

## Overview
- Task ID: 3N7T95
- Title: Driver Trip Event Processor with Safe State Transitions (Go)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3n7t95-driver-trip-event-processor-with-safe-state-transitions-go

## Requirements
- Correct event handling  Each event must be applied only once using EventID.  Duplicate events must be detected, counted, and not re-applied.  Events must be processed as received (do not sort or change input order).
- Safe driver state management  Driver state must be strictly isolated by DriverID.  Each driver can have only one active trip at a time.  End or cancel events that do not match the active trip must be safely ignored.  Negative fare values must be rejected.  Invalid or malformed events must be ignored and must not corrupt driver state.  Events from one driver must never affect another driver.
- Accurate tracking and reporting  LastSeenTimestamp must always be the maximum timestamp seen for each driver.  Reporting must separately include:  number of applied events  number of duplicate events  number of orphaned events  number of invalid or rejected events

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
