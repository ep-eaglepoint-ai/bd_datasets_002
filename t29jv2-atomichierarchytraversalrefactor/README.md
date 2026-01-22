# T29JV2 - atomicHierarchyTraversalRefactor

**Category:** sft

## Overview
- Task ID: T29JV2
- Title: atomicHierarchyTraversalRefactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: t29jv2-atomichierarchytraversalrefactor

## Requirements
- The traversal must be strictly iterative to ensure immunity to stack depth limits regardless of hierarchy size.
- The implementation must correctly handle DAGs; if multiple nodes share the same child, that child's weight (and its subtree) must only be summed once per call.
- A custom 'CircularDependencyError' must be raised if the traversal detects a path cycle, returning the ID of the node that closed the loop.
- Implement a generational caching strategy that stores pre-calculated weights and operates within the 128MB heap limit.
- The system must support 'Atomic Invalidation': updating a specific node's value must only invalidate that node and its direct/indirect ancestors in the cache.
- The service must be thread-safe, ensuring that concurrent weight requests and cache invalidations maintain strict mathematical consistency.
- Testing: Include a unit test for a diamond-shaped DAG to ensure no double-counting of shared nodes.
- Testing: Include an adversarial test with 10,000+ nodes and a leaf-to-root cycle to verify cycle detection under depth.
- Testing: Include a stress test with 50+ concurrent threads performing interleaved reads and partial updates.

## Metadata
- Programming Languages: python
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
