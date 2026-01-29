# HX9C52 - Exactly-Once Payment Ledger Stream Processor (Out-of-Order + Dedup + Bounded Buffer)

**Category:** sft

## Overview
- Task ID: HX9C52
- Title: Exactly-Once Payment Ledger Stream Processor (Out-of-Order + Dedup + Bounded Buffer)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hx9c52-exactly-once-payment-ledger-stream-processor-out-of-order-dedup-bounded-buffer

## Requirements
- Commit only if seq == last_committed_seq + 1 per account_id
- Buffer events where seq > last_committed_seq + 1
- Buffer cap: 200 events per account; on overflow, evict oldest buffered and log LedgerGapEviction
- Function: process_payment_batch(state, events) -> Manifest categorizing each event as COMMITTED, BUFFERED, DUPLICATE, or DROPPED_BY_OVERFLOW

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
