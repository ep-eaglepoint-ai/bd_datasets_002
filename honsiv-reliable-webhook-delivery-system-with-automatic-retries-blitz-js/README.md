# HONSIV - Reliable Webhook Delivery System with Automatic Retries (Blitz.js)

**Category:** sft

## Overview
- Task ID: HONSIV
- Title: Reliable Webhook Delivery System with Automatic Retries (Blitz.js)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: honsiv-reliable-webhook-delivery-system-with-automatic-retries-blitz-js

## Requirements
- Send outgoing webhooks for internal application events (e.g. user.created, invoice.paid)
- Persist all webhook deliveries in the database
- Guarantee idempotent delivery per endpoint and event
- Automatically retry failed deliveries
- Mark deliveries as permanently failed after max retry attempts
- Retry on non-2xx HTTP responses, timeouts, and network errors
- Use exponential backoff with jitter between retries
- Configurable maximum retry attempts (default: 10)
- Track attempt count, last error, last HTTP status, and next retry time
- Webhook endpoints with URL, secret, enabled flag, and subscribed event types

## Metadata
- Programming Languages: TypeScript
- Frameworks: Blitz.js
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
