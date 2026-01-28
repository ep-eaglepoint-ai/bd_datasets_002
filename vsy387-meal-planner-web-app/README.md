# VSY387 - meal planner web app

**Category:** sft

## Overview
- Task ID: VSY387
- Title: meal planner web app
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vsy387-meal-planner-web-app

## Requirements
- The system must allow users to create, edit, and delete meals, storing meal name, ingredients, quantities, and optional notes while validating input with Zod.
- The application must allow users to assign meals to days in a weekly planner, supporting easy rescheduling and multi-week navigation.
- The system must generate an automatic grocery list by aggregating ingredients from all planned meals while merging duplicates and summing quantities.
- The application must store all meal plans locally, ensuring offline functionality and persistence across reloads.
- The system must support editing grocery lists, allowing users to mark items as purchased or remove unnecessary ingredients.
- The application must provide basic search and filtering, enabling users to find meals by name or ingredient.
- The system must handle edge cases such as empty meal slots, missing ingredient quantities, duplicate meals, and deleted meals referenced in old plans without breaking.
- The application must support exporting meal plans and grocery lists in a structured format such as JSON or CSV.

## Metadata
- Programming Languages: Typescript
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
