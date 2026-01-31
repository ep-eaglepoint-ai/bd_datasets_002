# HET2RV - Build Deadline Reminder System for Project Management Platform

**Category:** sft

## Overview
- Task ID: HET2RV
- Title: Build Deadline Reminder System for Project Management Platform
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: het2rv-build-deadline-reminder-system-for-project-management-platform

## Requirements
- Allow users to configure multiple reminders per task
- Trigger reminders exactly once
- Deliver notifications at correct times
- Cancel reminders when tasks are canceled
- Persist reminder state in the database
- Ensure idempotent reminder execution
- Background processing must not block APIs
- System must survive restarts

## Metadata
- Programming Languages: TypeScript
- Frameworks: (none)
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
