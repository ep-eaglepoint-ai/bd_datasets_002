# 89FK50 - Refactor Booking Service to Prevent Overlaps

**Category:** sft

## Overview
- Task ID: 89FK50
- Title: Refactor Booking Service to Prevent Overlaps
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 89fk50-refactor-booking-service-to-prevent-overlaps

## Requirements
- Extract validation and overlap detection logic
- Reject all overlapping bookings correctly
- Preserve API endpoint and response format
- Maintain Node.js 18+ compatibility

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
