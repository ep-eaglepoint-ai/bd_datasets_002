# LMMEPG - TypeScript Recurring Event Scheduler - Timezone and Date Handling Bug Fix

**Category:** sft

## Overview
- Task ID: LMMEPG
- Title: TypeScript Recurring Event Scheduler - Timezone and Date Handling Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lmmepg-typescript-recurring-event-scheduler-timezone-and-date-handling-bug-fix

## Requirements
- Daily recurrence must use date component arithmetic (setDate/getDate), not millisecond addition. The buggy code adds 24*60*60*1000 which fails during DST when days are 23 or 25 hours. To verify: generate daily 9 AM events across March 10, 2024 (US DST start) - all should be at 9 AM local time, not 8 AM or 10 AM.
- Monthly recurrence on day 31 must clamp to the last valid day of shorter months. The buggy code lets JavaScript auto-correct Feb 31 to March 3. To verify: Jan 31 monthly event should appear on Feb 28 (or 29 in leap year), not March 2-3.
- Timezone offset must be recalculated for each occurrence date, not cached at construction time. The buggy code stores offset once and reuses it. To verify: America/New_York events should have correct time in both January (EST, UTC-5) and July (EDT, UTC-4).
- Yearly recurrence on Feb 29 must fall back to Feb 28 in non-leap years instead of skipping. The buggy code produces no occurrence for that year. To verify: Feb 29, 2024 birthday should appear on Feb 28, 2025, not be skipped.
- End date comparison must be inclusive and compare local dates in the event's timezone, not UTC timestamps. The buggy code compares UTC which causes off-by-one errors. To verify: event ending "on March 15" must include March 15 occurrences but not March 16.
- weekStartsOn must be read from options parameter, not hardcoded. The buggy code ignores the option and always uses 0. To verify: with weekStartsOn=1 (Monday), a Monday event should generate Mondays, not Sundays.
- getNextOccurrence must return null when no occurrence exists strictly after the given date, not return the last occurrence. The buggy code returns occurrences[0] without checking if it's actually after afterDate. To verify: calling getNextOccurrence with afterDate equal to the last occurrence should return null.
- Month addition must handle both year rollover AND day clamping together. The buggy code fails when Oct 31 + 1 month crosses into November (30 days). To verify: October 31, 2024 + 1 month = November 30, 2024 (not crash or December 1).
- maxOccurrences must default to 1000 and be enforced in the generation loop. The buggy code has no limit and hangs on events with no end date. To verify: event with no end date should return at most 1000 occurrences, not hang.
- isValidDay must verify the actual day-of-week of the generated date matches the pattern's daysOfWeek array. The buggy code returns true without checking. To verify: weekly Tuesday event should never generate Wednesday occurrences.
- Timezone parameter must be validated using Intl.DateTimeFormat and throw a descriptive error for invalid values. The buggy code accepts any string and produces NaN. To verify: timezone="Invalid/Zone" should throw "Invalid timezone: Invalid/Zone", not silently produce bad dates.
- generateOccurrences must skip ahead to the query's startDate instead of iterating from event.startDate. The buggy code starts from event creation and iterates through years of occurrences. To verify: querying 2024 occurrences for event created in 2020 should complete instantly, not take seconds.

## Metadata
- Programming Languages: Typescript
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
