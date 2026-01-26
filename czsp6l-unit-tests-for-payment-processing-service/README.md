# CZSP6L - Unit Tests for Payment Processing Service

**Category:** sft

## Overview
- Task ID: CZSP6L
- Title: Unit Tests for Payment Processing Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: czsp6l-unit-tests-for-payment-processing-service

## Requirements
- Optimize the runtime and memory usage of compute_customer_report for large inputs.
- Preserve the exact returned structure and field meanings shown in the docstring.
- Preserve all filtering logic (invalid IDs, timestamp rules, allowed event types).
- Preserve FX conversion semantics (missing currency rate defaults to 1.0).
- Preserve tie-breaking for top_event_type (highest count, then lexicographically smallest).
- Preserve rounding behavior for total_spend_usd and avg_ticket_usd (6 decimals).
- Keep shard deterministic for the same customer_id.
- Keep the function signature the same (no new required parameters).
- Add lightweight internal validation where needed, but do not change outputs for valid inputs.

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
