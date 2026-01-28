# UDHMPT - Appointment Booking System (RedwoodJS) 

**Category:** sft

## Overview
- Task ID: UDHMPT
- Title: Appointment Booking System (RedwoodJS) 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: udhmpt-appointment-booking-system-redwoodjs

## Requirements
- Provider onboarding: create profile, services offered, appointment durations.
- Recurring availability rules (weekly patterns, custom days, multiple windows/day).
- One-off overrides (extra availability or exceptions).
- Manual time blocking (vacations, meetings).
- Buffer time before/after appointments.
- Customers browse availability by service, duration, provider, and date range.
- Real-time slot listing (only show bookable slots).
- Book appointment with confirmation screen + booking reference.
- Reschedule/cancel with policy rules (cutoff time, cancellation window, penalties flag).
- Provider schedule calendar with day/week/month views.
- Booking details panel (status, customer info, notes).
- Time zone support end-to-end (provider TZ + customer TZ) and DST-safe slot generation.
- Prevent double booking using database transaction logic and/or optimistic locking.
- Booking cutoffs (e.g., cannot book within X hours) and max bookings per slot/day.
- Capacity support (1:1 default, but allow “group session” capacity > 1 as an option).

## Metadata
- Programming Languages: TypeScript
- Frameworks: RedwoodJS
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
