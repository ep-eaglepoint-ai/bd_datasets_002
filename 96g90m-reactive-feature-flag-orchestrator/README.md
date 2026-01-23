# 96G90M - Reactive-Feature-Flag-Orchestrator

**Category:** sft

## Overview
- Task ID: 96G90M
- Title: Reactive-Feature-Flag-Orchestrator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 96g90m-reactive-feature-flag-orchestrator

## Requirements
- schema_parity_validation: Define a single, authoritative Zod schema using a discriminated union to validate flags based on a 'type' field. The schema must enforce specific constraints: Percentages must be 0-100, Booleans must be strict, and Enums must match a predefined set of strings.
- draft_state_orchestration: Implement a Zustand store that maintains a 'staged_changes' buffer separate from the 'persisted_state'. The store must provide a computed 'is_dirty' flag and a 'validation_errors' object derived from the Zod schema.
- optimistic_concurrency_control: The persistence layer must track a 'version_id' (UUID or integer). Any 'Save' request must include the 'version_id' the client originally read; if the server's current version differs, the update must be rejected to prevent mid-air collisions.
- atomic_file_persistence: Implement a backend module using Node.js 'fs/promises' to manage a local 'config.json'. All updates must be atomic; a failed validation or version mismatch must leave the file in its original state.
- schema_driven_ui_rendering: The frontend must dynamically render input fields based on the flag type. If a flag type is changed in the draft, the value must be reset to a valid default for that new type according to the Zod schema.
- real_time_error_reporting: Validation must occur on every keystroke within the Zustand store. The 'Commit' button must be disabled and display a summary of Zod validation errors if the staged state is invalid.
- transactional_sync_protocol: When the 'Sync' action is triggered, the system must re-validate the entire payload on the server before writing to disk, ensuring that even if the client-side validation is bypassed, the database remains consistent.
- state_reversion_logic: Provide a mechanism to 'Discard' all staged changes and reset the Zustand store to the current server-side 'version_id' and data state.
- testing_collision_resilience: Author a test case simulating two clients attempting to update the same flag with different version headers, verifying that only the first request succeeds.
- testing_type_integrity: Verify that attempting to save a 'Percentage' flag with a value of 101 or a 'Boolean' flag with a string value results in a 400 Bad Request with specific Zod error mapping.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Next.js
- Libraries: zod
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
