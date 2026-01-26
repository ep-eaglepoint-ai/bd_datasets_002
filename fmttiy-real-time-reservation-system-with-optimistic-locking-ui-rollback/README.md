# FMTTIY - Real-Time Reservation System with Optimistic Locking & UI Rollback

**Category:** sft

## Overview
- Task ID: FMTTIY
- Title: Real-Time Reservation System with Optimistic Locking & UI Rollback
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: fmttiy-real-time-reservation-system-with-optimistic-locking-ui-rollback

## Requirements
- The backend update SQL must explicitly check version = incoming_version and increment it. Using SELECT then UPDATE without the version check in the WHERE clause is an automatic fail (Race Condition).
- The React onClick handler must update the local state before await api.post(...). Waiting for the response to update state is a failure.
- The frontend catch block must explicitly revert the specific seat's status to "AVAILABLE" if the API returns a 409/Version Error.
- The backend broadcast logic must filter out the connection of the user who made the change (if the WebSocket ID is tracked) OR the frontend must handle receiving its own echo gracefully without flickering.
- Use of FOR UPDATE or LOCK TABLES is a violation of the negative constraint.
- The frontend useEffect for the WebSocket must include logic to reconnect or at least log a clear error on onclose.
- The React state must handle the "Loading" intermediate state correctly preventing the user from clicking the seat twice while the request is in flight
- The TypeScript interfaces for Seat and WebSocketMessage must be defined and strictly used. Using any for the seat object is a failure

## Metadata
- Programming Languages: Python 3.10+, FastAPI, React 18, TypeScript,
- Frameworks: React , Fastapi
- Libraries: axios, websocket
- Databases: SQLite (standard library)
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
