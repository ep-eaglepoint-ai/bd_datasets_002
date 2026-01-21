# 83NYOV - Fixing e-commerce schema

**Category:** sft

## Overview
- Task ID: 83NYOV
- Title: Fixing e-commerce schema
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 83nyov-fixing-e-commerce-schema

## Requirements
- Make all relationships explicit with proper @relation directives and relation names.
- Remove redundant foreign keys and eliminate circular ownership.
- Define cascade behavior (onDelete) explicitly where appropriate.
- Introduce missing entities (e.g., User) if necessary for ownership consistency.
- Enforce multi-tenant boundaries with Store as the tenant root.
- Ensure arrays reference the correct models with named relations.
- Preserve all existing business logic.
- Be scalable, maintainable, and Prisma-valid for SaaS use.

## Metadata
- Programming Languages: TypeScript
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
