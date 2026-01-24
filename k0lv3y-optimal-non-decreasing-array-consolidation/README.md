# K0LV3Y - Optimal Non-Decreasing Array Consolidation

**Category:** sft

## Overview
- Task ID: K0LV3Y
- Title: Optimal Non-Decreasing Array Consolidation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k0lv3y-optimal-non-decreasing-array-consolidation

## Requirements
- Time Complexity: O(n²) or better.
- Space Complexity: O(n)
- Optimal solution for the full array depends on optimal solutions for subarrays.
- Subarray consolidation decisions may repeat.
- Already non-decreasing arrays → return original length
- Strictly decreasing arrays → must consolidate to single element
- You must strategically choose which subarrays to consolidate to maximize the final array length while ensuring the non-decreasing property
- Early termination when no beneficial consolidations remain.
- Partial consolidation may be required for optimal solution.
- Single-element arrays → return 1.
- Consolidate any contiguous subarray into its sum.
- Maintain non-decreasing property in the final array.
- Maximize the final array length after consolidation.

## Metadata
- Programming Languages: C++, Python
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
