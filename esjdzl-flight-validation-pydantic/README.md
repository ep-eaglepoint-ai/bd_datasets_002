# ESJDZL - flight-validation-pydantic

**Category:** sft

## Overview
- Task ID: ESJDZL
- Title: flight-validation-pydantic
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: esjdzl-flight-validation-pydantic

## Requirements
- Identify validation, design, and correctness issues caused by the use of dataclasses.
- Explain why manual validation is insufficient for this use case.
- Refactor the models to use Pydantic v2.
- Use declarative constraints (Field, enums, regex, bounds).
- Implement proper cross-field validation using field_validator.
- Ensure immutability where appropriate.
- Preserve the original business intent and model structure.
- Use Pydantic v2 APIs only.
- Do not introduce new business logic beyond validation fixes.
- Avoid breaking existing field names unless strictly necessary.
- Ensure all validation errors are explicit and non-silent.

## Metadata
- Programming Languages: Python
- Frameworks: FastAPI
- Libraries: (none)
- Databases: PostgreSQL
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
