# 9E6LME - Fullstack Meeting Room Booking System

**Category:** sft

## Overview
- Task ID: 9E6LME
- Title: Fullstack Meeting Room Booking System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9e6lme-fullstack-meeting-room-booking-system

## Requirements
- Overlapping bookings must be rejected atomically. If 30 users simultaneously attempt to book Room 1 from 9:00-10:00 AM on the same date, exactly 1 booking must succeed and 29 must receive HTTP 409 Conflict. Zero duplicate bookings may exist in the database.
- Back-to-back bookings must be allowed. If Room 1 has a booking from 9:00-10:00, a new booking from 10:00-11:00 must succeed. The overlap check must use strict inequality (new_start < existing_end AND new_end > existing_start).
- Boundary bookings must be handled correctly. A booking starting at exactly 9:00 AM must be accepted. A booking ending at exactly 6:00 PM must be accepted. A booking from 5:30 PM to 6:30 PM must be rejected (extends past operating hours).
- Past bookings must be rejected. If current time is 2:00 PM, a booking request for 1:00-2:00 PM on the same day must return HTTP 400 with clear error message.
- Duration constraints must be enforced. Bookings shorter than 15 minutes must be rejected. Bookings longer than 4 hours (240 minutes) must be rejected.
- Midnight crossing must be prevented. A booking from 11:00 PM to 1:00 AM must be rejected even if both times fall within operating hours on their respective days.
- User ownership must be enforced for cancellation. If User A created a booking, User B calling DELETE /api/bookings/:id must receive HTTP 403 Forbidden.
- Past booking cancellation must be prevented. If a booking's start_time has already passed, DELETE must return HTTP 400 with message indicating past bookings cannot be cancelled.
- Double cancellation must be handled safely. If a booking is already cancelled, a second DELETE request must return HTTP 400 indicating already cancelled, not create any database errors or corrupt state.
- Invalid room booking must be rejected. POST /api/bookings with roomId=999 (non-existent room) must return HTTP 404, not create orphaned records or corrupt database state.
- Authentication must be required for booking operations. All /api/bookings endpoints must return HTTP 401 if no valid JWT token is provided in the Authorization header.
- Database must be seeded automatically on startup. When docker-compose up runs, the 3 rooms (Boardroom/10, Focus Room/4, Phone Booth/2) and 2 test users (alice@test.com, bob@test.com with password "password123") must exist without manual intervention.
- The solution must pass a concurrent booking stress test where 10 simultaneous HTTP requests attempt to book the same room for the same time slot. After completion, exactly 1 booking must exist in the database - not 2, 3, or more.

## Metadata
- Programming Languages: Javascript
- Frameworks: Nodejs, React
- Libraries: (none)
- Databases: Postgress
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
