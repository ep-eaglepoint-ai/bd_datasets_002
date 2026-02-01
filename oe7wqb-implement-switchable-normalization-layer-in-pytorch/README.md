# OE7WQB - Implement Switchable Normalization Layer in PyTorch

**Category:** sft

## Overview
- Task ID: OE7WQB
- Title: Implement Switchable Normalization Layer in PyTorch
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: oe7wqb-implement-switchable-normalization-layer-in-pytorch

## Requirements
- Compute BatchNorm, InstanceNorm, and LayerNorm simultaneously
- Use learnable weights for mean and variance
- Apply softmax to importance weights
- Support 2D convolutional input (NCHW)
- Maintain running mean and variance for BatchNorm
- Correctly handle training and inference modes
- Include affine scale and bias parameters
- Ensure broadcast-safe tensor operations
- Use unbiased=False for variance
- Include epsilon for numerical stability
- Efficient forward computation without redundancy
- Compatible with PyTorch autograd
- Replaceable in place of BatchNorm2d

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
