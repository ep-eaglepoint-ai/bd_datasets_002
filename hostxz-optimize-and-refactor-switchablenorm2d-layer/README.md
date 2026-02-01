# HOSTXZ - Optimize and Refactor SwitchableNorm2d Layer

**Category:** sft

## Overview
- Task ID: HOSTXZ
- Title: Optimize and Refactor SwitchableNorm2d Layer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hostxz-optimize-and-refactor-switchablenorm2d-layer

## Requirements
- Remove all Python loops over batch, channel, or spatial dimensions
- Vectorize all mean and variance calculations
- Eliminate redundant tensor cloning and detaching
- Remove repeated softmax computations
- Replace manual broadcasting with implicit PyTorch broadcasting
- Optimize running statistics updates for training mode
- Ensure correct handling of evaluation mode using running stats
- Maintain proper autograd support
- Reduce memory allocations and temporary tensors
- Consolidate duplicated code and helper functions
- Improve variable naming for clarity
- Structure forward pass for readability and maintainability
- Ensure numerical stability with proper epsilon handling

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
