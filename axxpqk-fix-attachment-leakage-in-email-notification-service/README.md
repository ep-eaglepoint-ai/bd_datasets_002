# AXXPQK - Fix Attachment Leakage in Email Notification Service

**Category:** sft

## Overview
- Task ID: AXXPQK
- Title: Fix Attachment Leakage in Email Notification Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: axxpqk-fix-attachment-leakage-in-email-notification-service

## Requirements
- Ensure attachment isolation per email
- Preserve method signature
- Always include standard footer attachment
- Prevent cross-user attachment leakage
- Maintain deterministic behavior

## Metadata
- Programming Languages: Python
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
