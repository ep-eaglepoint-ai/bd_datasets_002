# UD7D4K - Adversarial, CI-Stable Test Suite for Power Transformer Structural Scaling

**Category:** sft

## Overview
- Task ID: UD7D4K
- Title: Adversarial, CI-Stable Test Suite for Power Transformer Structural Scaling
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ud7d4k-adversarial-ci-stable-test-suite-for-power-transformer-structural-scaling

## Requirements
- Reject inputs containing NaN or ±inf with a clear ValueError.
- Reject empty arrays with a clear ValueError.
- Reject non-1D arrays except a (n,1) column vector which must be accepted and flattened
- Coerce valid numeric inputs to float dtype and preserve shape (n,) in outputs.
- fit_transform_power(..., method="box-cox") must raise ValueError when any value ≤ 0, and the error message must include the minimum value.
- fit_transform_power(..., method="yeo-johnson") must accept arrays containing negative, zero, positive values and return finite outputs.
- For any valid input, transformed output must contain only finite values.
- invertibility_check must return True for correct (original, transformed, transformer) within tolerance and False for intentionally corrupted transformed data.
- invertibility_check must raise a shape mismatch ValueError if original and transformed lengths differ.
- Running fit_transform_power twice on the same deterministic input must yield identical transformer.lambdas_ (within a tight tolerance).
- normality_report(test="normaltest") must fall back to Shapiro-Wilk when n < 20 and label this in test_name.

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
