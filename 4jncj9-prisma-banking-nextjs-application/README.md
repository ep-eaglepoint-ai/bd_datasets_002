# 4JNCJ9 - prisma-banking-nextjs-application

**Category:** sft

## Overview
- Task ID: 4JNCJ9
- Title: prisma-banking-nextjs-application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4jncj9-prisma-banking-nextjs-application

## Requirements
- Next.js Server-Side Enforcement: All Prisma logic and database operations must be strictly confined to the Next.js server layer (Server Actions or API Routes). The frontend React components must never import the Prisma client or expose database connection strings to the client bundle.
- Atomic Prisma Transactions: Implement the refund logic using the `$transaction` API. The check for 'Remaining Refundable Balance' and the subsequent 'Refund Record Creation' must occur as an indivisible atomic operation to prevent concurrent admins from exceeding the total transaction amount.
- Fiscal Consistency Rules: The system must enforce that the Sum(All Refunds) ≤ Original Transaction Amount. Automatically transition the parent transaction status to 'REFUNDED' if the remaining balance hits zero, or 'PARTIALLY_REFUNDED' for any non-zero refund.
- oncurrency & Conflict Handling: Implement a strategy to identify and gracefully reject stale requests. If two simultaneous requests target the same transaction and their combined total exceeds the available balance, the server must reject the late-arriving request with a 409 Conflict or 422 Unprocessable Entity.
- Data Type Precision: Use the Prisma 'Decimal' type for all currency calculations to prevent floating-point precision errors during the aggregation of multiple partial refunds.
- UI state synchronization: Utilize Next.js specific data fetching and mutation patterns (such as 'useFormStatus' or 'revalidatePath') to ensure the UI updates the 'Current Balance' immediately following a successful server-side transaction.
- Idempotency Controls: Prevent accidental double-processing of a single refund intent. Ensure the system can identify retried requests without creating duplicate records in the database.
- Testing Requirement: Write an integration test using the Next.js environment that fires multiple concurrent refund requests at a single mocked database entry to prove that the transaction principal is never exceeded.
- Testing Requirement: Verify that a request for a refund amount larger than the available remaining balance returns a clear error message that is then rendered by the React frontend without a full page crash.
- Testing Requirement: Demonstrate that 'Vanishment' of the Prisma client from the client-side bundle is successful (no DB credentials present in the JS transmitted to the browser).

## Metadata
- Programming Languages: JavaScript, TypeScript
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
