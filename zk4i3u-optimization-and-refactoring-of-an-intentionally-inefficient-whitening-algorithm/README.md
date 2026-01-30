# ZK4I3U - Optimization and Refactoring of an Intentionally Inefficient Whitening Algorithm

**Category:** sft

## Overview
- Task ID: ZK4I3U
- Title: Optimization and Refactoring of an Intentionally Inefficient Whitening Algorithm
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zk4i3u-optimization-and-refactoring-of-an-intentionally-inefficient-whitening-algorithm

## Requirements
- The optimized code produces numerically equivalent outputs to the original within floating-point tolerance.
- The public class name, method names, and method signatures remain unchanged.
- All Python for loops over samples or features are eliminated from core numerical paths
- Covariance, mean, and whitening operations use vectorized NumPy or BLAS-backed routines.
- Runtime performance improves measurably on large datasets (e.g., ≥10× speedup for n ≥ 10⁴).
- Memory usage is reduced by eliminating redundant array copies
- PCA whitening yields decorrelated features with unit variance.
- ZCA whitening preserves original feature orientation while whitening.
- Dimensionality reduction via keep_dims behaves identically to the original implementation.
- Shrinkage and eps parameters affect numerical stability in the same way as before.
- inverse_transform reconstructs inputs accurately for full-rank cases.
- diagnostics reports equivalent metrics to the original implementation.

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
