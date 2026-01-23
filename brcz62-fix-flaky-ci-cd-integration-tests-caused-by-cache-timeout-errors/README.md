# BRCZ62 - Fix Flaky CI/CD Integration Tests Caused by Cache Timeout Errors

**Category:** sft

## Overview
- Task ID: BRCZ62
- Title: Fix Flaky CI/CD Integration Tests Caused by Cache Timeout Errors
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: brcz62-fix-flaky-ci-cd-integration-tests-caused-by-cache-timeout-errors

## Requirements
- Must be implemented in JavaScript
- Must not use hardcoded sleep() or setTimeout() delays for synchronization
- Must accurately fail when the expected event does not occur within 5 seconds
- Must minimize wait time when the event resolves quickly
- Must use a wait-and-retry (polling) or event-listener-based approach
- Must eliminate test flakiness and achieve 100% stability over 100 consecutive runs
- Must significantly reduce overall test execution time compared to the current implementation

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
