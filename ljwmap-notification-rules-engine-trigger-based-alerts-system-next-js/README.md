# LJWMAP - Notification Rules Engine – Trigger-Based Alerts System (Next.js)

**Category:** sft

## Overview
- Task ID: LJWMAP
- Title: Notification Rules Engine – Trigger-Based Alerts System (Next.js)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ljwmap-notification-rules-engine-trigger-based-alerts-system-next-js

## Requirements
- Build the application using Next.js (App Router) and TypeScript
- Provide a UI to create, edit, delete, and view notification rules
- Allow rules to be triggered by event types (e.g. order_created, payment_failed)
- Support simple conditional logic on event data (equals, greater than, less than)
- Enable selection of notification channels (in-app, webhook)
- Implement an API endpoint to receive events in JSON format
- Evaluate incoming events against stored rules and trigger notifications
- Store rules, events, and triggered notifications in a database (Prisma + SQL)
- Include a test screen to send sample events and preview triggered alerts

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
