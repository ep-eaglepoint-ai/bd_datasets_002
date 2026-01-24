# PWRDDI - consistency-state-sync-engine

**Category:** sft

## Overview
- Task ID: PWRDDI
- Title: consistency-state-sync-engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pwrddi-consistency-state-sync-engine

## Requirements
- Implement a mechanism to track causal relationships between operations (e.g., ensuring an 'edit' operation is never applied before the 'create' operation it depends on).
- The system must resolve concurrent edits to the same object property without using a central server timestamp, ensuring all nodes reach an identical state (Strong Eventual Consistency).
- Support deep-nested object reconciliation; updating `user.profile.bio` should not overwrite concurrent changes to `user.profile.avatar`.
- Handle 'late-arriving' operations from reconnected clients that have a logical 'past' timestamp but arrive after 'future' operations have already been integrated.
- The memory footprint for tracking metadata (versioning/tombstones) must be bounded or include a pruning strategy to prevent exhaustion over long sessions.
- Testing: Create a simulation suite where three clients perform 100 interleaved operations with randomized latencies (50ms - 2000ms). Assert that after all messages are delivered, the `JSON.stringify(state)` is identical across all three clients. Include a test case for a 'long partition' (10 seconds) where one client drifts significantly before syncing.

## Metadata
- Programming Languages: TypeScript
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
