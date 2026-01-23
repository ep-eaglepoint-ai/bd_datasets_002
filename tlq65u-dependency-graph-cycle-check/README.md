# TLQ65U - Dependency Graph Cycle Check

**Category:** sft

## Overview

- Task ID: TLQ65U
- Title: Dependency Graph Cycle Check
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tlq65u-dependency-graph-cycle-check

## Requirements

- The input represents a directed graph of task dependencies.
- Each task is identified by an integer from 0 to numTasks - 1.
- A dependency (u, v) means task u must finish before task v starts.
- The function must return true if at least one cycle exists in the graph.
- The function must return false if no cycles exist.
- A task depending on itself is considered a cycle.
- The solution must handle disconnected graphs correctly.
- The solution must detect multiple independent cycles if they exist.
- The solution must work even if the graph has no edges.
- The function must handle very large graphs efficiently.
- Time complexity must be linear in the number of tasks and dependencies.
- Additional memory usage must be linear in the number of tasks or less.
- The solution must avoid deep recursion that exceeds system limits.
- Duplicate dependencies must not affect correctness.
- Brute-force path enumeration is not allowed.
- Adjacency matrices must not be used.
- Language-specific cycle detection libraries must not be used.

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

## Commands

### Repository Before

- No repository before

### Repository After

```bash
docker compose run --rm app pytest -v tests
```

###

```bash
docker compose run --rm app python evaluation/evaluation.py
```
