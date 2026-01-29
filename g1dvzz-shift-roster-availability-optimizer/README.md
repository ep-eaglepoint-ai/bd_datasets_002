# G1DVZZ - shift-Roster-Availability-Optimizer

**Category:** sft

## Overview
- Task ID: G1DVZZ
- Title: shift-Roster-Availability-Optimizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g1dvzz-shift-roster-availability-optimizer

## Requirements
- Dictionary-Based Indexing: During class initialization, build a map where keys are 'Roles' and values are lists of employees. This must allow for immediate retrieval of potential candidates without iterating the entire staff list during a query.
- Complexity Shift: Achieve a transformation from $O(N)$ to $O(1)$ (amortized) for retrieving the base list of skilled workers, ensuring sub-millisecond responses for queries regardless of the total staff count.
- Testing Requirement: Write a benchmark test using the `timeit` module with a mock dataset of 20,000 employees. Demonstrate that the optimized version is at least 100x faster than the original linear search.
- Testing Requirement: Verify that if no workers match the role or all matching workers are 'on_duty', the function returns an empty list without throwing a KeyError.

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
