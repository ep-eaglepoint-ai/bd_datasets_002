# 733HPH - Advanced RMSNorm Implementation for Deep Transformers

**Category:** sft

## Overview
- Task ID: 733HPH
- Title: Advanced RMSNorm Implementation for Deep Transformers
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 733hph-advanced-rmsnorm-implementation-for-deep-transformers

## Requirements
- Implement RMS normalization using root mean square.
- Support optional learnable scale (gamma).
- Support optional learnable bias (beta).
- Allow normalization across one or multiple axes.
- Handle dynamic input shapes with any number of dimensions.
- Automatically broadcast weight and bias to match input.
- Be mixed-precision safe (float16, bfloat16, float32).
- Include optional learnable epsilon per feature.
- Prevent division by zero for zero-vector inputs.
- Preserve original input data type after normalization
- Be compatible with JIT and ONNX.
- Include clear type hints and docstrings.
- Optionally support residual scaling for deep transformers.

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
