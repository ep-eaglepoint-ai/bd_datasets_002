# H1ELMO - Reliable User Activity Event Processing with Audit Reporting

**Category:** sft

## Overview
- Task ID: H1ELMO
- Title: Reliable User Activity Event Processing with Audit Reporting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: h1elmo-reliable-user-activity-event-processing-with-audit-reporting

## Requirements
- Activity tracking must always be correct  LastSeenAt must be updated for every event that has a non-empty UserID  This update must happen even if the event is rejected or duplicated  The system must not create user state for empty or missing UserIDs  Events arriving out of order must not break activity tracking
- Duplicate events must be handled safely  Only events that were successfully applied may be considered duplicates later  Duplicate applied events must never apply their effects more than once  Rejected events must not be counted as applied  Duplicate detection must be based on EventID
- Retries must work correctly  Rejecting an event must not permanently block that EventID  A later retry with the same EventID and corrected data must still be allowed to apply  Duplicate protection must prevent double effects, not valid recovery
- Reporting must be clear and provable  The report must prove: total input events = applied events + duplicate events + rejected events (by reason)  Applied, duplicate, and rejected events must be counted separately  Rejected events must be grouped by clear and specific reasons
- Input handling rules  Events must be processed in the order they appear in the input  The input batch must not be sorted or mutated

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
