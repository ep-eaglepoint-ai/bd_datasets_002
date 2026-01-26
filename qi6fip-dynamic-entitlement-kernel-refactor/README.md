# QI6FIP - dynamic-Entitlement-Kernel-Refactor

**Category:** sft

## Overview
- Task ID: QI6FIP
- Title: dynamic-Entitlement-Kernel-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qi6fip-dynamic-entitlement-kernel-refactor

## Requirements
- The evaluation engine must be 'Fail-Closed': If a database error occurs, access must be denied, and the error must be propagated or handled according to a configurable policy, never silenced.
- Implement an 'Explainability' requirement: The system must be able to return not just a boolean, but a reason code (e.g., 'BYPASS_SUPERUSER', 'EXPIRED_OVERRIDE', 'MISSING_MEMBERSHIP').
- Separate the data retrieval layer (Database/Cache) from the logic layer using an abstraction that allows for deterministic testing without mocks.
- The logic must support hierarchical resolution: if a user has 'ADMIN_DELETE', they implicitly have 'READ' and 'WRITE'. This hierarchy must be configurable without changing the core engine code.
- The system must handle temporal permissions (Rule 3 and Rule 4) correctly, ensuring that an expired permission is never retrieved from cache as 'valid'.
- The refactored code must eliminate the 'Promise.some' and nested callback-style logic in favor of a clean, composable evaluation pipeline.
- Testing Requirement: Include a test case for a 'Race Condition' scenario where a user's group membership is revoked while an evaluation is in progress.
- Testing Requirement: Write an adversarial test where the database returns an empty set for the user but the cache contains a stale 'true' value; verify the system handles the inconsistency safely.
- Testing Requirement: Verify that a request for 'WRITE' access returns 'true' if the user only has the 'ADMIN_ALL' override.

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
