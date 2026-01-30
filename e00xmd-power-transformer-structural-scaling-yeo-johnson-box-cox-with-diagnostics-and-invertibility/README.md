# E00XMD - Power Transformer Structural Scaling (Yeo–Johnson & Box–Cox) with Diagnostics and Invertibility

**Category:** sft

## Overview
- Task ID: E00XMD
- Title: Power Transformer Structural Scaling (Yeo–Johnson & Box–Cox) with Diagnostics and Invertibility
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: e00xmd-power-transformer-structural-scaling-yeo-johnson-box-cox-with-diagnostics-and-invertibility

## Requirements
- Use only Python + NumPy + SciPy + scikit-learn (no extra dependencies required for core functionality).
- Provide a public function (e.g., fit_transform_power) that accepts a 1D array (or (n,1) column vector) and returns (transformed_array, fitted_transformer).
- Input validation must reject empty arrays, NaN, and ±inf with a clear ValueError.
- Input validation must reject non-1D arrays except an (n,1) column vector which must be flattened consistently
- Support method="yeo-johnson" and method="box-cox"; any other method value must raise a clear error.
- For method="box-cox", raise ValueError if any value ≤ 0, and the message must include the minimum value found.
- For method="yeo-johnson", the transform must accept negative, zero, and positive values and return finite output.
- The transformed output must be float dtype, shape (n,), and contain only finite values.
- Provide a function (e.g., normality_report) that computes skewness, kurtosis (Fisher), and a normality test result with a p-value.
- Provide a boolean decision function (e.g., improved_normality(before, after)) that returns (bool, metrics) using measurable criteria (at minimum: |skew| decreases and |kurtosis| decreases, and optionally p-value does not worsen).

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

## Testing and Evaluation

### Run tests for the implementation (expected all pass)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
```

**Expected behavior:**
- All tests: ✅ PASS

#### Run evaluation (collects task metrics and generates evaluation report)
```bash
docker compose run --rm app python evaluation/evaluation.py
```

This will:
- Run tests for repository_after implementations
- Generate a report at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`

#### Run evaluation with custom output file
```bash
docker compose run --rm app python evaluation/evaluation.py --output /path/to/custom/report.json
```

## Patches
To generate a patch for the implementation made:
```bash
git diff --no-index repository_before repository_after > patches/task_001.patch
```
