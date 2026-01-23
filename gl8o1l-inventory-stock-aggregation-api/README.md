# GL8O1L - Inventory Stock Aggregation API

**Category:** sft

## Overview
- Task ID: GL8O1L
- Title: Inventory Stock Aggregation API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gl8o1l-inventory-stock-aggregation-api

## Requirements
- Refactor the API to be production-grade.
- Improve performance and scalability.
- Ensure correct SKU-level aggregation.
- Remove shared mutable state.
- Add input validation.
- Improve API design and clarity.
- Follow Spring Boot conventions.
- Use Java and Spring Boot.
- Maintain logical equivalence of functionality.
- Avoid unnecessary dependencies.
- Handle large datasets efficiently.
- Ensure the solution is thread-safe and maintainable.

## Metadata
- Programming Languages: Java
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
