# TQIO7C - Refactor and Fix Go Graph Implementation

**Category:** sft

## Overview
- Task ID: TQIO7C
- Title: Refactor and Fix Go Graph Implementation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tqio7c-refactor-and-fix-go-graph-implementation

## Requirements
- Fix runtime panics (nil map access, index out of bounds).
- Correct infinite loops and traversal logic in BFS and DFS.
- Ensure all maps are initialized before use.
- Verify array/slice accesses are within bounds.
- For BFS implementation Fix queue loop conditions, visited map, and neighbor iteration.
- For DFS implementation Correct path construction, cycle prevention, and unreachable target handling.
- For Shortest Path implementation Fix visited check, parent map updates, and path reconstruction.
- Initialize all maps in NewGraph
- Handle duplicate edges, self-loops, and edge input validation.
- Consider using struct keys for edge weights instead of strings.
- Add proper error handling and input validation.
- Handle empty graphs, disconnected nodes, self-loops, duplicate edges, and invalid node IDs.
- Ensure all algorithms terminate correctly without panics.

## Metadata
- Programming Languages: Go
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
