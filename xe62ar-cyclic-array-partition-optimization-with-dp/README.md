# XE62AR - Cyclic Array Partition Optimization with DP

**Category:** sft

## Overview
- Task ID: XE62AR
- Title: Cyclic Array Partition Optimization with DP
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xe62ar-cyclic-array-partition-optimization-with-dp

## Requirements
- All edge cases, including k ≥ n, k = 1, wraparound partitions, and extreme or identical values, must be handled correctly.
- The system must partition a cyclic integer array into at most k contiguous, non-overlapping subarrays, allowing wraparound at the array boundary.
- The solution must run in O(n² × k) time or better and use no more than O(n × k) space.
- Implementation must be in Python 3.11, use no external libraries, and include a helper function to compute cyclic subarray ranges.

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
