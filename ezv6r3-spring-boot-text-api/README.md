# EZV6R3 - Spring Boot Text Api

**Category:** sft

## Overview
- Task ID: EZV6R3
- Title: Spring Boot Text Api
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ezv6r3-spring-boot-text-api

## Requirements
- The endpoint path and HTTP method must remain unchanged.
- The controller must be safe for concurrent requests.
- Shared mutable state must be removed.
- Input must be validated before any processing occurs.
- Null, empty, and whitespace-only input must be rejected.
- Validation failures must return a client error response.
- Runtime errors must not expose stack traces or internal details.
- Error responses must be structured and consistent.
- Inefficient string concatenation must be avoided.
- Raw maps must not be used for request or response bodies.
- Request and response models must be strongly typed.
- Standard Spring Boot conventions must be followed.
- Built-in validation and exception handling mechanisms must be used.
- No external libraries may be introduced.
- No new functionality may be added beyond error handling.

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
