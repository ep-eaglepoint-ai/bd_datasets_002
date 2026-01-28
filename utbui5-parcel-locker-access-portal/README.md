# UTBUI5 - parcel-Locker-Access-Portal

**Category:** sft

## Overview
- Task ID: UTBUI5
- Title: parcel-Locker-Access-Portal
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: utbui5-parcel-locker-access-portal

## Requirements
- Database Schema: Define tables for `Lockers` (id, size, status) and `Parcels` (recipient, locker_id, pin_hash, expires_at, status).
- Security Logic: Store the PINs using a secure one-way hashing function; the raw PIN must never be stored directly in the database and only shown once to the courier.
- State Management: Implement a backend background worker or a revalidation hook that transitions `OCCUPIED` lockers to `EXPIRED` once the `expires_at` timestamp is passed.
- Collision Prevention: Ensure that a courier cannot 'Check In' a package into a locker that is already marked as `OCCUPIED`.
- Frontend UI: Create a 'Courier Check-In' form and a 'Resident PIN Pad' UI. Use React state to handle loading indicators and error messages (e.g., 'Invalid PIN', 'Locker Already Empty').
- API Constraints: Residents should not be able to list all parcels; the retrieval API must require the recipient's email *and* the PIN to return a success status.
- Testing Requirement: Write an integration test where a package is checked in with an `expires_at` 5 seconds in the past; verify that the Resident UI returns 'PIN Expired'.
- Testing Requirement: Verify that after a parcel is 'COLLECTED', the associated locker ID transitions back to the `AVAILABLE` status for the next courier.

## Metadata
- Programming Languages: JavaScript,TypeScript
- Frameworks: Next.js
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
