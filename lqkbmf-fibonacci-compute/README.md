# LQKBMF - fibonacci compute

**Category:** sft

## Overview
- Task ID: LQKBMF
- Title: fibonacci compute
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lqkbmf-fibonacci-compute

## Requirements
- The `fib(n)` function must be optimized from O(2^n) to O(n) or better. Use memoization (caching) or convert to iterative approach. The function must return the same values as the original for all inputs.
- The `fib_sequence(n)` function must generate the first n Fibonacci numbers efficiently. Avoid recalculating values—build on previous results. Time complexity should be O(n).
- The `fib_sum(n)` must sum the first n Fibonacci numbers in O(n). The `find_fib_index(target)` must find which Fibonacci number equals target in O(n) worst case.
- The optimized code must handle n=1000 within 1 second (original would take longer than the age of the universe). Results must match the mathematical definition of Fibonacci numbers.

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
