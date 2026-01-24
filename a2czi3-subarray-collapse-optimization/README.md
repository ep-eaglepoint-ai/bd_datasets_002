# A2CZI3 - Subarray Collapse Optimization

**Category:** sft

## Overview
- Task ID: A2CZI3
- Title: Subarray Collapse Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: a2czi3-subarray-collapse-optimization

## Requirements
- Determine the maximum length of a non-decreasing array obtainable after merges.
- Allow zero or more merge operations on contiguous subarrays.
- Correctly identify when no merges are needed or when full collapse is required.
- Preserve element order after merges.
- Time Complexity: O(n²) or better.
- Space Complexity: O(n²) auxiliary space maximum.
- Mandatory use of Dynamic Programming.
- DP state must track current index in the array and last value in the constructed non-decreasing sequence
- Use prefix sums for efficient subarray sum computation.
- Return a single integer representing the maximum valid array length.

## Metadata
- Programming Languages: Python, C++
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
