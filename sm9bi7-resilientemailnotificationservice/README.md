# SM9BI7 - resilientEmailNotificationService

**Category:** sft

## Overview
- Task ID: SM9BI7
- Title: resilientEmailNotificationService
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sm9bi7-resilientemailnotificationservice

## Requirements
- Migrate synchronous email calls to a BullMQ producer that pushes 'email_task' jobs into a Redis-backed queue.
- Implement a worker with an exponential backoff strategy (initial delay 5s, max 3 attempts) and randomized jitter.
- Use a 'Job Deduplication' key (e.g., a hash of user_id + notification_type + timestamp) to ensure idempotency at the worker level.
- Implement a Circuit Breaker pattern that monitors error rates and transitions to an 'Open' state, halting processing after 10 consecutive failures.
- Include a 'Dead Letter Queue' (DLQ) mechanism for jobs that exhaust all retry attempts, including a summary of failure reasons.
- Testing: Simulate an SMTP provider outage and verify that jobs are held in the queue and retried correctly when the provider 'recovers'.
- Testing: Verify via unit tests that submitting the same unique notification payload twice results in only one job being enqueued.

## Metadata
- Programming Languages: JavaScript
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
