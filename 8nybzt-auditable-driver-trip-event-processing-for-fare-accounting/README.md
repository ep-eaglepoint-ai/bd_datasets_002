# 8NYBZT - Auditable Driver Trip Event Processing for Fare Accounting

**Category:** sft

## Overview
- Task ID: 8NYBZT
- Title: Auditable Driver Trip Event Processing for Fare Accounting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8nybzt-auditable-driver-trip-event-processing-for-fare-accounting

## Requirements
- Financial Integrity  Negative monetary values must be explicitly rejected  Rejected events must never affect financial aggregates
- Reconciliation & Accountability  The report must prove: total_input_events = applied + duplicate + rejected (by reason)  Rejected events must be classified by reason (no lumping)
- State Tracking & Retry Safety  LastSeenTimestamp must be updated for every event with a valid DriverID, regardless of business validity  Rejected events must not permanently mark an EventID as processed; corrected retries must still be allowed to apply

## Metadata
- Programming Languages: Go (standard library only)
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
