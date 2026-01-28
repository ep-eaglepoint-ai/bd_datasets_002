# CCFUGK - Customer Support Ticketing & SLA Management System (Full-Stack)

**Category:** sft

## Overview
- Task ID: CCFUGK
- Title: Customer Support Ticketing & SLA Management System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ccfugk-customer-support-ticketing-sla-management-system-full-stack

## Requirements
- 1. Ticket Creation Customers or agents can create tickets   Tickets start in the OPEN state   Priority determines SLA response deadline   Confirmation after successful creation
- 2. Ticket Listing Agents can view all tickets   Tickets can be filtered by status, priority, or assignee   Tickets can be sorted by SLA deadline or creation time
- 3. Ticket Assignment Only authenticated agents can assign tickets   A ticket can only have one assignee at a time   Assignment updates must be atomic   Reassignment must update audit history
- 4. Ticket Updates Agents can update ticket status   Invalid state transitions must be rejected   Multiple agents attempting updates concurrently must not corrupt state
- 5. SLA Tracking SLA deadline calculated based on priority   SLA countdown pauses when ticket is in WAITING state   SLA breach must be detectable and logged
- 6. Ticket History Track all ticket changes: Field changed   Previous value   New value   User who made the change   Timestamp   History is append-only and read-only.
- 7. User Authentication & Roles Email/password authentication   JWT-based authentication   Roles: AGENT, ADMIN   Role-based permissions enforced server-side

## Metadata
- Programming Languages: Javascript, Typescripts, CSS
- Frameworks: React (Vite), Node.js, Express, Tailwind CSS
- Libraries: JWT
- Databases: PostgreSQL
- Tools: Docker, docker-compose
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
