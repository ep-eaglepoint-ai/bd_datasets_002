# O7K6N8 - Feature Flag Management System (SaaS-Style Backend with Next.js)

**Category:** sft

## Overview
- Task ID: O7K6N8
- Title: Feature Flag Management System (SaaS-Style Backend with Next.js)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: o7k6n8-feature-flag-management-system-saas-style-backend-with-next-js

## Requirements
- User authentication with role-based access (admin, user)
- Admins can create, update, and delete feature flags
- Each feature flag must have a unique key and description
- Support global enable/disable toggle for each flag
- Support percentage-based rollout (0–100%)
- Support per-user overrides that take priority over all other rules
- Deterministic flag evaluation to ensure consistent results per user
- Endpoint to fetch all evaluated feature flags for a logged-in user
- Admin interface to manage flags and user overrides
- Audit logging of all feature flag changes

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
