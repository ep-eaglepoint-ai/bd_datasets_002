# X47NQW - personal expense tracker

**Category:** sft

## Overview
- Task ID: X47NQW
- Title: personal expense tracker
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: x47nqw-personal-expense-tracker

## Requirements
- Implement user signup and login using NextAuth.js with email/password credentials, secure session management with JWT strategy, and protected routes that redirect unauthenticated users to the login page
- Build a form to add new transactions with amount, description, date, type (income/expense), and category selection, with the ability to edit and delete existing transactions, and input validation for required fields
- Provide predefined expense categories (Food, Transport, Entertainment, Bills, Shopping, etc.) and income categories (Salary, Freelance, Investment, etc.), displayed with distinct colors for visual identification in charts and lists
- Display transactions in a paginated list sorted by date, with filters for date range (this week, this month, custom range), transaction type, and category, showing running balance or totals for filtered results
- Create a dashboard showing total income, total expenses, and net balance for the selected period, with a pie chart breaking down expenses by category and a bar chart showing daily or monthly spending trends
- Provide a monthly view showing income vs expenses comparison, top spending categories, and percentage change from the previous month, helping users understand their spending patterns over time

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nextjs
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
