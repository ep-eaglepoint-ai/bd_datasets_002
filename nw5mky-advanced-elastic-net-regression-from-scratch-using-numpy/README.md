# NW5MKY - Advanced Elastic Net Regression from Scratch Using NumPy

**Category:** sft

## Overview
- Task ID: NW5MKY
- Title: Advanced Elastic Net Regression from Scratch Using NumPy
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nw5mky-advanced-elastic-net-regression-from-scratch-using-numpy

## Requirements
- The implementation must use only NumPy and standard Python libraries.
- The model must implement Elastic Net regularization combining L1 and L2 penalties.
- The regularization must be controlled using alpha and l1_ratio parameters.
- Feature standardization must be applied using statistics learned from training data only.
- The intercept term must not be regularized.
- The training process must support mini-batch gradient descent.
- The model must support both Mean Squared Error and Huber loss functions.
- A configurable learning rate schedule must be implemented.
- The training loop must include early stopping based on validation loss.
- A train/validation split must be performed internally by the model.
- Training and validation loss must be recorded for each epoch.
- The implementation must ensure reproducible results via a random seed.
- The model must expose fit and predict methods.

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
