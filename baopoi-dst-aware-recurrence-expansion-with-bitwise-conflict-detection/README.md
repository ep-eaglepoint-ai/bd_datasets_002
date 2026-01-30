# BAOPOI - DST-Aware Recurrence Expansion with Bitwise Conflict Detection

**Category:** sft

## Overview
- Task ID: BAOPOI
- Title: DST-Aware Recurrence Expansion with Bitwise Conflict Detection
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: baopoi-dst-aware-recurrence-expansion-with-bitwise-conflict-detection

## Requirements
- The code must produce instances that remain at "09:00" local time throughout the year, even across DST boundaries. Shifting to 08:00 or 10:00 is a failure.
- The final output instances must be stored in UTC.
- Must support Frequency (Daily/Weekly), Interval (Every 2 weeks), and ByDay (Mon/Wed).
- Usage of dateutil.rrule is an automatic failure. Logic must be manual.
- The AvailabilityMatrix must use binary representation (e.g., bytearray, int bitmasks) for time slots. Using lists of datetime objects for checking conflicts is a failure.
- The system must map timestamps to 15-minute alignment for the bitmask index.
- Must identify exactly who is busy on a conflicted date.
- The logic must handle Feb 29th correctly if the range includes it.
- Must use zoneinfo.ZoneInfo for offset calculations.
- The bitmask should ideally cover the range, not necessarily the whole epoch.

## Metadata
- Programming Languages: Python 3.10
- Frameworks: (none)
- Libraries: datetime, zoneinfo (Standard Lib).
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
