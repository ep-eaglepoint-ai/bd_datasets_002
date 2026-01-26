# XQEA88 - Simple API Usage Monitor (Standalone Next.js App)

**Category:** sft

## Overview
- Task ID: XQEA88
- Title: Simple API Usage Monitor (Standalone Next.js App)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xqea88-simple-api-usage-monitor-standalone-next-js-app

## Requirements
- Build a standalone Next.js application using TypeScript
- Implement backend API routes for ingesting API usage events
- Store API usage data in PostgreSQL using Prisma ORM
- Support multi-tenant data isolation
- Authenticate ingestion requests using API keys
- Support two roles: Admin and Viewer
- Allow Admin users to view all tenants
- Restrict Viewer users to their own tenant
- Display total requests, error rate, and latency percentiles
- Show API usage over selectable time ranges (1h, 24h, 7d)
- Provide a paginated API events table
- Allow filtering by time range, endpoint, and status code group
- Include a simple request detail view
- Ensure basic input validation and rate limiting on ingestion
- Use a clean, minimal UI with Tailwind CSS
- Keep scope intentionally simple with no alerting or advanced analytics

## Metadata
- Programming Languages: TypeScript
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
