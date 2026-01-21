# 5QF3R5 - Unittest Pep8 Validator

**Category:** sft

## Overview
- Task ID: 5QF3R5
- Title: Unittest Pep8 Validator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5qf3r5-unittest-pep8-validator

## Requirements
- The test must check whether a Python file follows PEP 8 style rules.
- The test must be written using the unittest framework.
- The test must use the pep8 module for style checking.
- No additional dependencies may be used.
- The file path must be configurable.
- The test must assert that the total number of PEP 8 errors is zero.
- The test must fail if any PEP 8 violations are found.
- The failure message must clearly indicate that PEP 8 errors exist.

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
