# SAU4DZ - CI/CD Deterministic Dependency Resolution Engine

**Category:** sft

## Overview
- Task ID: SAU4DZ
- Title: CI/CD Deterministic Dependency Resolution Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sau4dz-ci-cd-deterministic-dependency-resolution-engine

## Requirements
- Strict Determinism: The function must implement a topological sort where independent nodes (or nodes available at the same depth) are prioritized alphabetically. The output order must be identical regardless of the input dictionary's iteration order.
- Robust Cycle Detection: The system must detect circular dependencies (e.g., A -> B -> A). Upon detection, it must raise a custom CircularDependencyError that includes the exact path of the cycle (e.g., ['A', 'B', 'A']) to aid debugging.
- Performance at Scale: The solution must be capable of resolving a linear dependency chain of 10,000+ nodes within 2 seconds. Implementations that use O(N²) memory/time logic (such as copying the path list at every step) will be rejected.
- No Recursion Limits: The implementation must effectively handle deep graphs that exceed the default Python recursion limit, either by using an iterative approach or managing the stack manually.
- Graph Integrity: The solution must correctly handle disconnected subgraphs (islands) and diamond dependencies, ensuring every node in the input graph appears exactly once in the output.
- Standard Library Only: The solution must use only the Python Standard Library (no networkx, numpy, etc.).

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
