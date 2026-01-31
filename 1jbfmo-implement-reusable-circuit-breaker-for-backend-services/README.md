# 1JBFMO - Implement Reusable Circuit Breaker for Backend Services

**Category:** sft

## Overview
- Task ID: 1JBFMO
- Title: Implement Reusable Circuit Breaker for Backend Services
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1jbfmo-implement-reusable-circuit-breaker-for-backend-services

## Requirements
- Support Closed, Open, and Half-Open states
- Track failures within a configurable time window
- Open circuit after failure threshold is exceeded
- Transition correctly after reset timeout
- Allow only one probe request in Half-Open
- Wrap asynchronous operations transparently
- Prevent memory growth from failure tracking
- Preserve original errors on failure

## Metadata
- Programming Languages: TypeScript,Node.js
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
