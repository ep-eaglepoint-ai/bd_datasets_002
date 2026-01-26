# 0DVSTL - high-Fidelity-Ledger-Testing

**Category:** sft

## Overview
- Task ID: 0DVSTL
- Title: high-Fidelity-Ledger-Testing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0dvstl-high-fidelity-ledger-testing

## Requirements
- Achieve 100% line and branch coverage as measured by standard coverage tools (e.g., `coverage.py`).
- Identify and test every unique exception path defined in `LedgerError`.
- Implement an idempotency test: Verify that calling `execute_transfer` multiple times with the same `tx_id` returns the expected status without deducting funds more than once.
- Validate financial precision: Include a test case that performs 100 transfers of '0.01' and verifies the final balance to ensure no rounding errors occur.
- Implement an adversarial 'Reversal Trap': Construct a scenario where a transaction is committed, but the receiver spends the money before a rollback is attempted. Verify that `rollback_transaction` correctly raises `REVERSAL_DENIED_INSUFFICIENT_FUNDS`.
- Test for 'Dirty State' prevention: Ensure that if a transfer fails midway (e.g., due to an exception), the balances of the sender and receiver are unchanged.
- Testing Requirement: Use isolated test cases with setup and teardown to ensure state from one test does not leak into another.
- Testing Requirement: Include a boundary test for the `Decimal` quantization logic, testing inputs like '10.005' and '10.004' to confirm correct rounding.
- Testing Requirement: Provide a parameterized test for `INVALID_ACCOUNT_ID` covering both missing sender and missing receiver scenarios.

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
