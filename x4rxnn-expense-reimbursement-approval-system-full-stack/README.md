# X4RXNN - Expense Reimbursement & Approval System (Full-Stack)

**Category:** sft

## Overview
- Task ID: X4RXNN
- Title: Expense Reimbursement & Approval System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: x4rxnn-expense-reimbursement-approval-system-full-stack

## Requirements
- 1. Expense Submission Employees can submit expense claims   Each claim must include amount, category, and description   Claims start in a PENDING state   Confirmation message after submission
- 2. Expense Listing Employees can view their own expense claims   Managers can view all claims   Claims can be filtered by status and date   Claims can be sorted by submission date or amount
- 3. Approval Workflow Only managers can approve or reject claims   A claim can only be approved or rejected once   Approval and rejection must be atomic   Users cannot approve their own claims   Status updates must be immediately reflected
- 4. Payment Processing Approved claims can be marked as PAID   Payment can only occur once per claim   Paid claims cannot be modified   Payment actions must be auditable
- 5. Audit History Track all state transitions: Claim   Previous status   New status   User who performed the action   Timestamp   Audit logs are append-only and read-only.
- 6. User Authentication & Roles Email/password authentication   JWT-based auth   Roles: EMPLOYEE, MANAGER   Role-based access control enforced server-side

## Metadata
- Programming Languages: Javascript, Typescript and Tailwind CSS
- Frameworks: Node.js, Express, React (Vite), Tailwind CSS
- Libraries: JWT
- Databases: PostgreSQL
- Tools: Docker, docker-compose
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
