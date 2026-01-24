# NUFUZP - Expense Splitting Application with Multi Algorithm Settlement

**Category:** sft

## Overview
- Task ID: NUFUZP
- Title: Expense Splitting Application with Multi Algorithm Settlement
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nufuzp-expense-splitting-application-with-multi-algorithm-settlement

## Requirements
- Users must be able to sign up and log in using email magic links. The authentication system must use NextAuth.js v5 with Resend as the email provider. Session must persist across page refreshes.
- All monetary values must be stored as integers representing cents. No floating-point arithmetic is allowed for money calculations. When splitting $100.00 among 3 people, the result must be exactly 3333 + 3333 + 3334 cents with the remainder assigned to the last participant.
- The application must support four split types: EQUAL (divide evenly), EXACT (specify exact amounts that must sum to total), PERCENTAGE (specify percentages that must sum to 100), and SHARE (specify ratios like 2:1:1)
- Balance calculations must be atomic. When an expense is added, edited, or deleted, all related balance updates must occur within a single database transaction. No partial updates are allowed.
- The settlement suggestion algorithm must produce the minimum number of transactions needed to settle all debts within a group. For balances [+5000, +3000, -4000, -4000] cents, the algorithm must produce at most 3 transactions.
- Users cannot leave a group if their balance is not zero. The system must block the leave action and display an appropriate error message
- Groups must support up to 50 members and 10,000 expenses without significant performance degradation. Balance calculations must complete within 2 seconds for maximum group size.
- The frontend must be fully responsive. On mobile devices, tables must convert to card layouts, and navigation must use a hamburger menu. All interactive elements must have minimum touch target size of 44x44 pixels.
- All forms must display loading spinners during submission and show error messages for validation failures. Network errors must be caught and displayed to the user.
- The entire application must start with a single docker compose up command. PostgreSQL database, migrations, and the Next.js application must all be orchestrated through Docker Compose with proper health checks

## Metadata
- Programming Languages: Typescript
- Frameworks: Nextjs
- Libraries: (none)
- Databases: postgress
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
