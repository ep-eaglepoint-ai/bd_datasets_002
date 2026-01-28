# 86ZNRX - Subscription Billing & Usage Tracking System (Full-Stack)

**Category:** sft

## Overview
- Task ID: 86ZNRX
- Title: Subscription Billing & Usage Tracking System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 86znrx-subscription-billing-usage-tracking-system-full-stack

## Requirements
- 1. Customer Management Create and list customers Each customer has: Name Email Active subscription plan Account status (active, suspended)
- 2. Subscription Plans List available plans Each plan includes: Name Monthly price Included usage units Cost per extra unit
- 3. Usage Tracking Record usage events: Customer Amount used Timestamp Usage events may be recorded concurrently Usage must never be lost or duplicated
- 4. Invoice Generation Generate monthly invoices per customer Invoice must include: Base subscription price Usage breakdown Overage charges if applicable Total amount Invoices are immutable once generated Regenerating an invoice for the same period is not allowed
- 5. Invoice History View past invoices per customer Read-only access Includes billing period and payment status
- 6. Authentication & Authorization Email/password authentication JWT-based auth Only authenticated users can: Record usage Generate invoices Read-only access for finance users

## Metadata
- Programming Languages: Javascript, Typescript, CSS
- Frameworks: React (Vite), Node.js, Express, Tailwind CSS
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
