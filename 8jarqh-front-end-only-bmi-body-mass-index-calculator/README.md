# 8JARQH - front-end only BMI (Body Mass Index) Calculator

**Category:** sft

## Overview
- Task ID: 8JARQH
- Title: front-end only BMI (Body Mass Index) Calculator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8jarqh-front-end-only-bmi-body-mass-index-calculator

## Requirements
- Users can enter height and weight to calculate BMI.
- Support Metric (cm, kg) and Imperial (ft/in, lb) units.
- Unit switch converts existing values (does not reset inputs).
- Validate inputs (required, numeric, realistic min/max) with inline errors
- Disable Calculate until inputs are valid.
- Display BMI rounded to 1 decimal.
- Show BMI category: Underweight, Normal, Overweight, Obese.
- Display healthy weight range for BMI 18.5–24.9 based on height
- Responsive layout (mobile + desktop).
- Clear labels, placeholders, and helpful text.
- Built with Vue 3
- No backend / no external database (browser-only).

## Metadata
- Programming Languages: TypeScript
- Frameworks: Vue 3
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
