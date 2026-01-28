# ZUYXHX - Time Tracking App (Clock In / Clock Out & Reports)

**Category:** sft

## Overview
- Task ID: ZUYXHX
- Title: Time Tracking App (Clock In / Clock Out & Reports)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zuyxhx-time-tracking-app-clock-in-clock-out-reports

## Requirements
- User authentication (sign up, login, logout)
- Clock in and clock out functionality
- Prevent multiple active clock-ins per user
- Store time entries with start time, end time, and optional notes
- View personal timesheet with date filtering
- Generate basic daily and weekly reports
- Export time reports to CSV
- Nuxt 3 frontend with simple dashboard and timesheet pages
- FastAPI backend with REST APIs and JWT authentication
- PostgreSQL database with migrations
- Basic error handling and validation

## Metadata
- Programming Languages: Python , TypeScript
- Frameworks: Nuxt 3, FastAPI
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
