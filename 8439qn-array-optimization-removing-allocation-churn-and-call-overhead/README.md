# 8439QN - Array Optimization Removing Allocation Churn and Call Overhead

**Category:** sft

## Overview
- Task ID: 8439QN
- Title: Array Optimization Removing Allocation Churn and Call Overhead
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8439qn-array-optimization-removing-allocation-churn-and-call-overhead

## Requirements
- the optimized solution must remove copy.deepcopy. It should use the "Double Buffer" pattern (two grids initialized once and swapped at the end of the loop).
- The get_neighbors logic must be inlined into the main loop or refactored to avoid the overhead of creating a stack frame for every single pixel.
- The code must run significantly faster (aiming for 10x-50x). If the logic still uses deepcopy or heavy list allocations inside the loop, it fails.
- Usage of import numpy is an automatic failure as per the constraints.
- The mathematical formula (current + average_of_neighbors) / 2.0 must be preserved exactly. Changing the physics model is a failure.
- he logic must correctly calculate the denominator for boundary cells (dividing by 2, 3, or 4 neighbors depending on position), ensuring the "Average" is mathematically correct.
- The solution should allocate memory once (initially) and reuse it. Creating new lists (e.g., neighbors = []) inside the hot loop is a failure.
- The output code must use proper type hints, specifically List[List[float]] for the return value.
- While not strictly mandatory for a pass, flattening the 2D list into a 1D list is the preferred engineering solution for cache locality in Python.

## Metadata
- Programming Languages: python 3
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
