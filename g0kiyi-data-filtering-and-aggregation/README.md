# G0KIYI - data filtering and aggregation

**Category:** rl

## Overview
- Task ID: G0KIYI
- Title: data filtering and aggregation
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g0kiyi-data-filtering-and-aggregation

## Requirements
- The original code scans all records to find matches on fields like `category` and `status`. Build index dictionaries on first query: `self._category_index = defaultdict(list)` mapping category values to lists of record indices. Subsequent queries for the same field should be O(1) lookup + O(k) iteration where k is the result size, not O(n) scan.
- Replace patterns that create full intermediate lists with generators. For example, `[r for r in records if condition]` followed by `[transform(r) for r in filtered]` should become a single generator expression or use `itertools.filterfalse`/`filter`. Only materialize to a list when the caller needs random access or length.
- Replace `if value in some_list` (O(n)) with `if value in some_set` (O(1)). Identify all places where a list is used for membership testing and convert to sets. This is especially important when the list is checked multiple times or is large.
- Replace manual loops for sum/max/min/count with built-in functions that are implemented in C and faster. Where multiple aggregations are needed, compute them in a single pass instead of iterating multiple times. Use `statistics` module for mean/median if needed.
- Replace any custom or nested loop-based sorting algorithms with Python's built-in `sorted()` and the `key` argument for customized sorting, ensuring optimal O(n log n) performance on large datasets.
- Avoid creating intermediate or duplicate data structures such as unnecessary lists or dict copies. Work directly with the original data wherever possible, and only copy data when absolutely necessary for correctness.

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
