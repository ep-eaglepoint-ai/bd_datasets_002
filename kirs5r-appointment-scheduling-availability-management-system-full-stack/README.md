# KIRS5R - Appointment Scheduling & Availability Management System (Full-Stack)

**Category:** sft

## Overview
- Task ID: KIRS5R
- Title: Appointment Scheduling & Availability Management System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kirs5r-appointment-scheduling-availability-management-system-full-stack

## Requirements
- 1. Provider Management List all providers Each provider has: Name Specialty Working hours (per weekday) Providers can be marked active or inactive
- 2. Availability Management Display provider availability by date Availability derived from: Working hours Existing appointments Past dates are read-only
- 3. Appointment Booking Create appointments with: Provider Patient name Date Start time End time Only future appointments can be booked Minimum duration: 15 minutes Appointments must not overlap
- 4. Appointment Updates Appointments can be: Rescheduled Canceled Past appointments cannot be modified Canceling frees the time slot
- 5. Appointment History View appointment history by provider Includes status and timestamps History is read-only
- 6. Authentication & Authorization Email/password authentication JWT-based auth Roles: Admin (manage providers) Staff (manage appointments) Provider (view own schedule)

## Metadata
- Programming Languages: Javascript, Typescript and CSS
- Frameworks: React (Vite), Nodejs, Express and Tailwind CSS
- Libraries: (none)
- Databases: PostgreSQL
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
