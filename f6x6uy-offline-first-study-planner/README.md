# F6X6UY - offline-first study planner

**Category:** sft

## Overview
- Task ID: F6X6UY
- Title: offline-first study planner
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f6x6uy-offline-first-study-planner

## Requirements
- The app must allow users to create, edit, delete, and list study subjects, storing subject metadata such as name, optional description, and timestamps, while preventing duplicate or empty subject names and handling cases where a subject is deleted but still referenced by study sessions.
- The system must support logging study sessions linked to specific subjects, storing duration, timestamp, and optional notes, while rejecting invalid durations, preventing negative or zero-time sessions, handling unrealistically long sessions, avoiding duplicate rapid submissions, and preventing sessions from being assigned to deleted or nonexistent subjects.
- The application must compute total study time per subject and overall, dynamically aggregating stored sessions and ensuring totals remain accurate when sessions are edited, deleted, backdated, or imported in bulk, including scenarios where subjects have no recorded sessions or extremely large datasets.
- The dashboard must display progress statistics such as daily, weekly, and monthly study summaries, per-subject breakdowns, and historical trends, while handling cases where no data exists, date ranges contain gaps, timestamps span multiple timezones, or extreme values distort visual scaling.
- The system must calculate study streaks based on consecutive days with at least one logged session, tracking current and longest streaks while handling same-day multiple sessions, retroactively logged sessions, timezone boundary shifts, missed-day resets, and restored streak scenarios.
- The application must support locally stored reminders for study schedules, storing reminder metadata such as trigger time, recurrence, and labels, while handling reminders set in the past, overlapping reminders, disabled notification permissions, missed triggers when the app is closed, and persistent scheduling across restarts.
- The app must be offline-first, meaning all core functionality should work without internet access, gracefully handling temporary database failures, partial writes, interrupted saves, stale cached state, and recovery after reconnection without corrupting stored data.
- MongoDB must be used as the primary and only database, with structured collections for subjects, study sessions, and reminders, enforcing referential consistency, preventing orphaned records, supporting schema evolution over time, and maintaining query performance under large read/write workloads.
- Zod must validate all user input and API payloads, enforcing strict type safety, rejecting malformed or malicious data, handling missing required fields, limiting payload size, and returning clear, human-readable validation errors both client-side and server-side.
- The UI must be clean, minimal, responsive, and performant, ensuring smooth rendering with large session histories, graceful handling of empty states, usable layouts on small screens, and predictable behavior under heavy interaction.

## Metadata
- Programming Languages: Typescript
- Frameworks: Nextjs
- Libraries: Zod, Tailwindcss
- Databases: MongoDB
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
