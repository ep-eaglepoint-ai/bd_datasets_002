# 2CZYGD - Binary String Trade Optimization 

**Category:** sft

## Overview
- Task ID: 2CZYGD
- Title: Binary String Trade Optimization 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 2czygd-binary-string-trade-optimization

## Requirements
- For each query [li, ri], perform at most one trade to maximize '1's in the substring.
- Handle queries independently; no modification carries over to other queries.
- Return an array of maximum active counts corresponding to each query.
- Handle edge cases: all zeros, all ones, single-character queries, alternating patterns.
- Time Complexity: O(q × n) or better, where q = number of queries, n = string length.
- Space Complexity: Must not exceed O(n) auxiliary space per query.
- Efficiently iterate through blocks; avoid nested brute-force searches over all substrings.
- Correctly compute net gain (activated_1s - deactivated_1s) and select maximum positive gain.
- Implement block detection using iteration and state tracking (no regex or external libraries).
- Return a list of integers where each element represents the maximum number of active segments after the optimal trade for the corresponding query

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
