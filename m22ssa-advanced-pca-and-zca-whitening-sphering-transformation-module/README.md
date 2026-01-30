# M22SSA - Advanced PCA and ZCA Whitening (Sphering) Transformation Module

**Category:** sft

## Overview
- Task ID: M22SSA
- Title: Advanced PCA and ZCA Whitening (Sphering) Transformation Module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: m22ssa-advanced-pca-and-zca-whitening-sphering-transformation-module

## Requirements
- Accept a 2D NumPy array of shape (n_samples, n_features) as input.
- Validate that the input contains at least two samples.
- Support PCA whitening and ZCA whitening selectable via a method parameter.
- Optionally center the data and store the mean for reuse.
- Use SVD on the centered data matrix to compute principal components.
- Add a configurable eps value to eigenvalues for numerical stability.
- Implement covariance shrinkage toward the identity matrix via a shrinkage parameter.
- Support optional dimensionality reduction using a keep_dims parameter.
- Produce decorrelated output with approximately unit variance.
- Provide fit, transform, and fit_transform methods.
- Implement an inverse_transform method to reconstruct original data.
- Ensure exact reconstruction when full dimensionality is retained.
- Return best subspace reconstruction when dimensionality is reduced.

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
