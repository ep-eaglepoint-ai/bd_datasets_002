# 8NBEOD - CSV to JSON Test Refactor

**Category:** sft

## Overview
- Task ID: 8NBEOD
- Title: CSV to JSON Test Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8nbeod-csv-to-json-test-refactor

## Requirements
- Remove all live HTTP requests by mocking network calls
- Eliminate dependency on a running API server
- Mock environment variables instead of using real values
- Avoid reading from or writing to the filesystem
- Use in-memory file objects for file-related tests
- Preserve all existing test scenarios and assertions
- Ensure tests run deterministically and offline
- Use only standard library mocking tools
- Keep tests readable, maintainable, and PEP8-compliant

## Metadata
- Programming Languages: Python
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

## Folder Layout

- `repository_before/`: Original tests (dependent on live server/env)
- `repository_after/`: Refactored tests (fully mocked/isolated)
- `evaluation/`: Scripts to compare implementations
- `trajectory/`: Log of the refactoring process

## Run with Docker

### Docker Execution
```bash
# Build the environment
docker compose build

# Run refactored tests
docker compose run --rm app python -m pytest repository_after/test_csv_to_json.py

# Run original tests
docker compose run --rm app python -m pytest repository_before/test_csv_to_json.py

# Run evaluation report
docker compose run --rm app python evaluation/evaluation.py
```