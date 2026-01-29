# 4N2GYR - Deterministic Event Analytics Order-Independent Dedup + Double-Login Policy

**Category:** sft

## Overview
- Task ID: 4N2GYR
- Title: Deterministic Event Analytics Order-Independent Dedup + Double-Login Policy
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4n2gyr-deterministic-event-analytics-order-independent-dedup-double-login-policy

## Requirements
- Implement: processEvents(events: unknown[]): AnalyticsResult  AnalyticsResult must include:  users: Record<string, { userId, sessions[], totalSessionTimeMs }>  global: { totalUniqueUsersSeen, totalValidSessions, averageSessionDurationMs, topUsersBySessionTime }  anomalies: { reason, eventId?, userId? }[]
- Exclude and record anomaly (reason starts with invalid_) if:  eventId not a non-empty string  userId not a non-empty string  timestamp not a finite number  eventType not in login | logout | action Invalid events must never participate in deduplication.
- Deduplicate by eventId after validation.  If multiple valid events share the same eventId and payload differs:  record anomaly duplicate_eventId_conflict  keep exactly one event using deterministic rule:  smaller timestamp  smaller eventType precedence: login < action < logout  smaller userId (lexicographic)  smaller stable JSON string  Output must be identical regardless of input order.

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
