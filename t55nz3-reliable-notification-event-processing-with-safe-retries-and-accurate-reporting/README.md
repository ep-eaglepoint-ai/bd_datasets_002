# T55NZ3 - Reliable Notification Event Processing with Safe Retries and Accurate Reporting

**Category:** sft

## Overview
- Task ID: T55NZ3
- Title: Reliable Notification Event Processing with Safe Retries and Accurate Reporting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: t55nz3-reliable-notification-event-processing-with-safe-retries-and-accurate-reporting

## Requirements
- Activity tracking must always be correct  lastSeenAt must be updated for every event that has a valid, non-empty notificationId  This update must happen even if the event is rejected or duplicated  The system must never create notification state for empty or missing notificationId  Out-of-order timestamps must not break activity tracking
- Duplicate events must be handled safely  Only events that were successfully applied may be treated as duplicates later  Duplicate applied events must never re-apply side effects
- Retries must behave correctly  Rejecting an event must not permanently block future retries  A retry with the same eventId and corrected data must still be allowed to apply  Protection against duplicates must prevent double effects, not valid recovery
- Notification state rules must be enforced  Valid state progression is: NONE → SENT → DELIVERED → ACKED  Events must never move the state backward  ACKED is a terminal state and cannot change  ackCount may increase only when an ACKED event is successfully applied
- eporting must be complete and provable  The report must prove: total input events = applied events + duplicate events + rejected events (by reason)  Applied, duplicate, and rejected events must be counted separately  Rejected events must be grouped by clear and specific reasons

## Metadata
- Programming Languages: TypeScript (no external libraries)
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
