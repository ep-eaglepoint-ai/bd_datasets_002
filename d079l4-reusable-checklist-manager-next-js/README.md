# D079L4 - Reusable Checklist Manager (Next.js)

**Category:** sft

## Overview
- Task ID: D079L4
- Title: Reusable Checklist Manager (Next.js)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: d079l4-reusable-checklist-manager-next-js

## Requirements
- Build with Next.js (App Router) and TypeScript
- Create reusable checklist templates
- Create checklist instances from templates
- Template edits must not affect existing instances
- Support required vs optional checklist items
- Allow marking items done/undone
- Show checklist progress and completion status
- Allow completing and archiving checklists
- Store data using Prisma + database (SQLite or Postgres)
- Use Server Actions for create/update/delete
- Clean, accessible UI with loading and empty states
- Validation and error handling

## Metadata
- Programming Languages: TypeScript
- Frameworks: Next.js
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
