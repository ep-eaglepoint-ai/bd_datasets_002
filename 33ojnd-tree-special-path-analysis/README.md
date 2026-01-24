# 33OJND - Tree Special Path Analysis

**Category:** sft

## Overview
- Task ID: 33OJND
- Title: Tree Special Path Analysis
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 33ojnd-tree-special-path-analysis

## Requirements
- Compute the longest downward path that satisfies the “at most one duplicate value” rule.
- If multiple paths have the same maximum length, return the one with the fewest nodes.
- Treat the undirected input graph as a tree rooted at node 0.
- Count edge weights accurately when computing path length.
- Handle all edge cases (single node, linear tree, duplicate-heavy trees).
- Time Complexity: O(n × k) or better, where k is the number of distinct values on a path.
- Space Complexity: O(n + d) or better, where d is the tree depth.
- Must use DFS or BFS traversal; brute-force path enumeration is disallowed.
- Dynamically track value frequencies during traversal (no precomputed paths).
- Only downward paths (ancestor → descendant) are valid.
- Do not use external graph libraries.

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
