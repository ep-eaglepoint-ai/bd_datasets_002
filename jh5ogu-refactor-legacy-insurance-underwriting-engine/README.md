# JH5OGU - Refactor-Legacy-Insurance-Underwriting-Engine

**Category:** sft

## Overview
- Task ID: JH5OGU
- Title: Refactor-Legacy-Insurance-Underwriting-Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jh5ogu-refactor-legacy-insurance-underwriting-engine

## Requirements
- Refactor the `underwrite_policy` logic into a collection of 'Rule' objects that implement a common interface with an `is_satisfied_by(user_data)` method.
- Implement a 'PolicySpecification' class that aggregates multiple rules and provides a unified 'evaluate' method to determine overall eligibility.
- Ensure the engine returns a detailed 'EvaluationResult' object containing the status and an exhaustive list of all violated rules (reasons).
- Decouple the rule selection logic so that different 'PolicyTypes' can use different combinations of rules without modifying the individual rule classes.
- Implement a 'CompositeRule' (AND/OR logic) that allows for combining simple rules into more complex eligibility criteria.
- Ensure the refactored system allows for the addition of a new 'Rule' class without modifying any existing files, adhering to the Open-Closed Principle.
- Testing: Implement unit tests for each individual rule in isolation using `pytest`, ensuring 100% code coverage for the logic previously hidden in nested conditionals.
- Testing: Write a test case for the 'PolicySpecification' that mocks individual rule results to verify that the aggregation logic correctly identifies all denial reasons.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: Pytest
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
