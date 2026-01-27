# BSFO0C - lunar-Cargo-Gravity-Refactor

**Category:** sft

## Overview
- Task ID: BSFO0C
- Title: lunar-Cargo-Gravity-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: bsfo0c-lunar-cargo-gravity-refactor

## Requirements
- Data Migration: Migrate from the sequential `items` array to a calculated `placement` strategy that specifies X (horizontal) and Y (vertical/height) positions for every item.
- CoG Balancing: The algorithm must prioritize placing items with the highest `weight` at the lowest possible Y-coordinate.
- Lateral Balance: Items should be distributed such that the weight on the left side (x < width/2) is within 10% of the weight on the right side (x > width/2).
- Constraint Preservation: The total `weight` of manifested items must still never exceed `roverConfig.maxCapacityWeight`.
- Optimization: Refactor the code to use a single pass for both sorting (by weight) and placement calculation.
- Testing Requirement: Write a test where three items {Heavy, Medium, Light} are provided. Verify the Heavy item is placed at `y=0` and centrally located.
- Testing Requirement: Verify that if five items of identical weight are provided, the final manifest placement result is laterally balanced across the X-axis.

## Metadata
- Programming Languages: JavaScript
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
