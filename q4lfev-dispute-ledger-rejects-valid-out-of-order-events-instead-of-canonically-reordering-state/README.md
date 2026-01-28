# Q4LFEV - Dispute Ledger Rejects Valid Out-of-Order Events Instead of Canonically Reordering State

**Category:** sft

## Overview
- Task ID: Q4LFEV
- Title: Dispute Ledger Rejects Valid Out-of-Order Events Instead of Canonically Reordering State
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: q4lfev-dispute-ledger-rejects-valid-out-of-order-events-instead-of-canonically-reordering-state

## Requirements
- Dispute state must be derived from canonical ordering, not arrival order.
- Out-of-order events must be reconciled, not rejected.
- State, history, and derived values must remain internally consistent.

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
