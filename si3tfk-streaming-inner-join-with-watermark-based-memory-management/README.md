# SI3TFK - Streaming Inner-Join with Watermark-Based Memory Management

**Category:** sft

## Overview
- Task ID: SI3TFK
- Title: Streaming Inner-Join with Watermark-Based Memory Management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: si3tfk-streaming-inner-join-with-watermark-based-memory-management

## Requirements
- - Accept two infinite generator streams as input, each yielding events with {id, timestamp, sensor_id, value}
- Join events from both streams with matching sensor_id within a 5-minute time window - Handle events arriving out-of-order (up to 30 seconds late)
- Implement watermark mechanism: watermark = max_timestamp_seen - 30 seconds
- Purge events older than the watermark from buffers to maintain constant memory
- Drop late events (arriving behind watermark) immediately with warning log
- When an event has a non-numeric timestamp, the system must log error: "Invalid event {id}: timestamp must be numeric, got {type}" and skip the event.
- Event validation must complete in < 1ms per event (< 0.05% of total processing time at 2,000 events/sec).
- The system must handle events with timestamps ranging from 0 to 2^31-1 (Unix timestamp range through year 2038).

## Metadata
- Programming Languages: collections, heapq, bisect, time, typing, logging
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
