# HW38TY - Sum of Squares Optimizer

**Category:** sft

## Overview
- Task ID: HW38TY
- Title: Sum of Squares Optimizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hw38ty-sum-of-squares-optimizer

## Requirements
- Input Handling: The input is an array of numbers, which may contain null or undefined. These invalid values should be ignored in the sum of squares computation.
- Optimize Runtime: The optimized function should improve runtime by at least 30% compared to the original implementation for arrays with approximately 1 million elements. The optimization should focus on reducing unnecessary operations and memory usage.
- Optimize Memory Usage: The optimized function should use less memory than the original, especially when dealing with large arrays (~1 million elements). Avoid storing intermediate arrays or objects unless necessary.
- Output: The output should be the sum of the squares of all valid numbers (non-null, non-undefined) in the array. It must match the output of the original function exactly for all test cases.
- Do Not Change API: The function should still accept an array of numbers as input and return a single number as output, as per the original API.
- Efficient Looping: Instead of iterating over the array twice (once to create the squared values and once to sum them), optimize the solution to calculate the sum directly in a single loop.

## Metadata
- Programming Languages: Javascript
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
