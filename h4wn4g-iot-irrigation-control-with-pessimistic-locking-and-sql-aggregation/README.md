# H4WN4G - IoT Irrigation Control with Pessimistic Locking and SQL Aggregation

**Category:** sft

## Overview
- Task ID: H4WN4G
- Title: IoT Irrigation Control with Pessimistic Locking and SQL Aggregation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: h4wn4g-iot-irrigation-control-with-pessimistic-locking-and-sql-aggregation

## Requirements
- The activation logic must use transaction.atomic() and Pump.objects.select_for_update() (or equivalent). Checking the state without a DB lock is an automatic Fail (Race Condition).
- The code must check last_activation_time. If the time delta is less than 15 minutes, the request must be ignored.
- The pump run duration must be capped (e.g., hardcoded or config). The system cannot rely on a "Stop" signal from the sensor (which might fail).
- The historical data view must use annotate, TruncHour, and Avg. Using a Python loop (for reading in all_readings:) is a performance Fail.
- The actual call to the hardware API (simulated) must happen inside a Celery task (@shared_task), not in the synchronous Django view.
- Multiple concurrent hits to the webhook must result in exactly one Celery task being enqueued during the cooldown window.
- The SensorReading model should strictly include an index on timestamp and zone for the aggregation query to be performant.
- Updating the pump status to "RUNNING" and scheduling the task must happen within the same transaction commit.
- Must use django.utils.timezone.now() (UTC) instead of datetime.now() to avoid timezone bugs.

## Metadata
- Programming Languages: Python 3.10+
- Frameworks: Django 4.2+,
- Libraries: (none)
- Databases: PostgreSQL
- Tools: Celery,Redis
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
