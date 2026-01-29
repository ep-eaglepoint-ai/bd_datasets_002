# EHHFJ9 - urban-Cargo-Capacity-Manager

**Category:** sft

## Overview
- Task ID: EHHFJ9
- Title: urban-Cargo-Capacity-Manager
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ehhfj9-urban-cargo-capacity-manager

## Requirements
- Atomic Capacity Check: Use a Prisma transaction in a Next.js Server Action to verify that `current_load + new_package_weight <= 25` before creating the assignment record. This must be an atomic operation to prevent over-loading during concurrent assignments.
- Server-Side Security: Ensure all database interactions are isolated in Server Actions. The client-side React code must not contain any Prisma client imports or direct database connection logic.
- Reactive Capacity UI: The dashboard must display the 'Remaining Capacity' for each courier. Use Next.js data revalidation (revalidatePath) to ensure the UI updates immediately across all dispatcher sessions once a package is assigned.
- Data Integrity: Implement a validation check that prevents packages with negative weights from being entered and ensures a package cannot be assigned to two different couriers simultaneously.
- Testing Requirement (Concurrency): Write a test simulating two dispatchers assigning 15kg packages to a courier with a fresh 25kg limit. Verify that one succeeds and the other receives a 'Capacity Exceeded' error.
- Testing Requirement (Happy Path): Verify that assigning a 5kg package correctly reduces the courier's visible remaining capacity from 25kg to 20kg in the database and UI.

## Metadata
- Programming Languages: JavaScript,TypeScript
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
