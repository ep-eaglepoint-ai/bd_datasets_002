# PKPRQF - Student Data Aggregation API

**Category:** sft

## Overview
- Task ID: PKPRQF
- Title: Student Data Aggregation API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pkprqf-student-data-aggregation-api

## Requirements
- Refactor the code to follow Spring Boot best practices
- Ensure the REST API is stateless and thread-safe
- Remove shared mutable state from the controller
- Improve performance by eliminating unnecessary nested loops
- Use efficient data aggregation logic with optimal time complexity
- Add proper input validation for request data
- Implement meaningful error handling and clear error responses
- Use appropriate HTTP status codes for success and failure cases
- Maintain logical equivalence of existing API functionality
- Keep the code clean, readable, and maintainable
- Maintain a clear separation of concerns
- Avoid introducing unnecessary external libraries

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
