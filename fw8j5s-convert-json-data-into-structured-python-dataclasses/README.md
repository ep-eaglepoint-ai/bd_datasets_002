# FW8J5S - Convert JSON Data into Structured Python Dataclasses

**Category:** sft

## Overview
- Task ID: FW8J5S
- Title: Convert JSON Data into Structured Python Dataclasses
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: fw8j5s-convert-json-data-into-structured-python-dataclasses

## Requirements
- Use Python dataclasses to define structured data models
- Convert JSON data (parsed as dictionaries) into corresponding dataclass instances
- Support nested JSON objects mapped to nested dataclasses
- Support lists of primitive values and lists of nested dataclasses
- Implement a generic, reusable conversion function
- Preserve type hints for better readability and IDE support
- Avoid third-party libraries; use only the Python standard library
- Include an example JSON payload and matching dataclass definitions

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
