# 4BCKO5 - Meeting Room Booking API Performance Fix

**Category:** sft

## Overview
- Task ID: 4BCKO5
- Title: Meeting Room Booking API Performance Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4bcko5-meeting-room-booking-api-performance-fix

## Requirements
- The GET /api/rooms endpoint must respond in under 200ms regardless of the number of active bookings in the system. With 10,000+ active bookings across all rooms, response time must not exceed this threshold. Currently, the endpoint takes 8-12 seconds during peak load.
- The GET /api/bookings/mine endpoint must respond in under 300ms regardless of how many bookings a user has (up to 1000 bookings per user). Response time must remain constant, not increase linearly with booking count as currently observed
- The GET /api/rooms/:id/bookings endpoint must respond in under 200ms for any date query. Database query plans must show index usage for date filtering - no full table scans on the bookings table when filtering by date.
- The POST /api/bookings endpoint must complete in under 500ms including all validations. This includes room existence check, time validation, overlap detection, and the actual insert operation.
- No single API request should execute more than 3 database queries (excluding BEGIN/COMMIT for transactions). Monitoring shows some endpoints currently execute N+1 queries where N is the number of results returned.
- Database connections must be released promptly. No endpoint should hold a connection longer than necessary for its queries. Connection pool exhaustion was observed during peak traffic.
- Application memory usage must remain stable under sustained load. After processing 1000+ consecutive requests, memory consumption should not grow unboundedly. No memory leaks from accumulated objects.
- All API endpoints must return identical response structures after optimization. Field names, data types, and nesting must match exactly. No changes to request/response formats are permitted.
- All existing business rules must work identically: booking validation (15min-4hr duration, 9AM-6PM operating hours, no past bookings, no midnight crossing), authentication requirements, authorization checks (users can only cancel own bookings), and the EXCLUDE USING GIST constraint for overlap prevention.
- Solutions must use only the pg library for database access. No ORMs (Prisma, TypeORM, Sequelize). No external caching layers (Redis, Memcached). Database schema changes are limited to adding indexes only.

## Metadata
- Programming Languages: Javascript
- Frameworks: (none)
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
