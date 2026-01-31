# EZCRJN - Customer Activity Feature Module for E-commerce Platform

**Category:** sft

## Overview
- Task ID: EZCRJN
- Title: Customer Activity Feature Module for E-commerce Platform
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ezcrjn-customer-activity-feature-module-for-e-commerce-platform

## Requirements
- Define Python functions or classes that track customer behavior features such as purchase frequency, average order value, session frequency, average session duration, abandoned carts, and support interactions.
- Features must be measurable, including numeric, categorical, or boolean values.
- Functions should be callable via Python to calculate and retrieve feature values.
- Ensure the module can handle customer data at scale, accommodating millions of customers without hardcoding specific examples.
- Include logic for handling trade-offs between short-term activity and long-term retention (e.g., using flags or indicators, not predictive models).
- Safely handle edge cases like missing data, empty inputs, or unusual customer metadata.
- The module must be written in Python 3.x and use only standard Python libraries (no third-party libraries).
- Do not implement machine learning algorithms, predictive models, or data analytics algorithms.
- The module must be fully self-contained in a file named customer_activity_features.py.
- Ensure that the code can be easily extended or modified without breaking the core functionality.

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
