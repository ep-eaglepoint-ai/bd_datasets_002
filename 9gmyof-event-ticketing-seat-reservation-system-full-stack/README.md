# 9GMYOF - Event Ticketing & Seat Reservation System (Full-Stack)

**Category:** sft

## Overview
- Task ID: 9GMYOF
- Title: Event Ticketing & Seat Reservation System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9gmyof-event-ticketing-seat-reservation-system-full-stack

## Requirements
- 1. Event Listing Display all upcoming events with: Event name Date & time Venue Number of available seats Events should be: Searchable by name or venue Sortable by date
- 2. Event Details View details for a single event: Event name Date & time Venue Total seats Available seats Seat map showing seat status Seat map must reflect real-time availability.
- 3. Seat Reservation Only authenticated users can reserve seats Reservation holds a seat temporarily Reserved seats are not visible as available to others A user may reserve multiple seats Reservation must be atomic Confirmation message after successful reser
- 4. Seat Purchase Only authenticated users can purchase seats they reserved Purchased seats cannot be reserved again Purchase finalizes the seat ownership Purchase must be atomic Confirmation message after successful purchase
- 5. Reservation Expiration Reserved seats expire after 10 minutes if not purchased Expired reservations automatically release seats Expired reservations must be recorded
- 6. Reservation & Purchase History Track all seat activity: Event Seat number User Action (RESERVE / PURCHASE / EXPIRE) Timestamp History is append-only and read-only.
- 7. User Authentication Email/password authentication User registration with name and email JWT-based authentication Only logged-in users can reserve or purchase seats

## Metadata
- Programming Languages: Javascript, Typscript, PostgreSQL, Tailwind CSS
- Frameworks: Backend: Node.js with Express, Frontend: React (Vite), Styling: Tailwind CSS
- Libraries: (none)
- Databases: Database: PostgreSQL
- Tools: Containerization: Docker + docker-compose
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
