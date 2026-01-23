# ZBJ5UC - Event Booking System

**Category:** sft

## Overview
- Task ID: ZBJ5UC
- Title: Event Booking System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zbj5uc-event-booking-system

## Requirements
- Full CRUD operations for event reservations
- Persistent storage (file-based or database) to prevent data loss.
- Clear feedback for successful actions and errors.
- Backend REST API with CRUD endpoints.
- Frontend UI for managing bookings.
- Form validation for required fields and data types.
- Display all relevant booking information.
- Confirm deletion before removing a booking.
- Clear view of bookings (table, cards, or list).
- Forms for creating/editing with validation errors visible.
- Required vs optional fields clearly marked.
- Form resets after creation or canceling edits.
- Empty state handled gracefully when no bookings exist.

## Metadata
- Programming Languages: Javascript, SQL
- Frameworks: React, Express
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
