# EMZMUO - Investment Portfolio Analytics Dashboard

**Category:** sft

## Overview
- Task ID: EMZMUO
- Title: Investment Portfolio Analytics Dashboard
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: emzmuo-investment-portfolio-analytics-dashboard

## Requirements
- Runs fully in the browser with no backend
- All six UI sections render real computed data
- No hardcoded output values (only hardcoded inputs)
- FIFO logic correctly handles partial lots
- Historical chart shows plausible growth
- No O(n²) transaction processing
- UI must remain responsive (no blocking renders)
- No fetch, no APIs, no localStorage, no server calls

## Metadata
- Programming Languages: Javascript
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
