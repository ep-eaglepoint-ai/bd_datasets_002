# IPOBQC - Bank Account Transfer

**Category:** sft

## Overview
- Task ID: IPOBQC
- Title: Bank Account Transfer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ipobqc-bank-account-transfer

## Requirements
- The function accepts source account ID, destination account ID, transfer amount, transfer timestamp, and request identifier
- The function validates that both accounts exist and are active.
- The function validates that the transfer amount is positive.
- The function checks that the source account has sufficient balance.
- The function prevents duplicate transfers using the request identifier.
- The function debits the source account balance.
- The function credits the destination account balance.
- The function records the transfer in a transaction ledger.
- The function writes an audit log entry.
- The function ensures both balances are updated atomically.
- The function returns a transfer result with status and message.

## Metadata
- Programming Languages: PostgreSQL
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
