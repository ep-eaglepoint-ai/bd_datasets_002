# MFQTGD - trustpay-p2p-settlement-engine

**Category:** sft

## Overview
- Task ID: MFQTGD
- Title: trustpay-p2p-settlement-engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: mfqtgd-trustpay-p2p-settlement-engine

## Requirements
- Atomic Multi-Account Settlement: Implement the settlement logic within a database transaction (SQL Transaction or Prisma $transaction). The deduction from the Payer and the credits to all Participants must succeed or fail as a single unit to prevent inconsistent ledger states.
- Double-Spend Prevention: The backend must explicitly verify the Payer's balance inside the transaction before any deductions occur. This prevents concurrent settlement requests from bypassing the balance check and resulting in a negative account balance.
- Fixed-Point Financial Math: Use integer-based 'cents' or a specialized Decimal library to store and calculate all balances. Floating-point arithmetic is strictly prohibited to avoid rounding errors that lead to 'vanishing pennies' during multi-user splits.
- Participant Validation: The system must verify that all Participant IDs exist and are active before initiating the transfer. If any ID in the group is invalid, the entire transaction must be aborted with a clear error message.
- Optimistic UI Updates: The React frontend must show an 'In Progress' state during the API call and update the user's balance immediately upon success. If a conflict or balance error occurs, the UI must revert the optimistic state and display a specific notification.
- Testing Requirement (Partial Failure): Mock a database error that occurs exactly halfway through a 5-person group settlement. Verify that the Payer's balance is unchanged and no partial credits were applied to the first two participants.
- Testing Requirement (Race Condition): Simulate two concurrent settlement attempts for the same Payer whose balance is only enough for one. Verify that exactly one transaction completes and the final balance matches the expected remaining credit.

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: React, Express
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
