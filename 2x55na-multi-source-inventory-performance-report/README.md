# 2X55NA - Multi-Source Inventory Performance Report

**Category:** sft

## Overview
- Task ID: 2X55NA
- Title: Multi-Source Inventory Performance Report
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 2x55na-multi-source-inventory-performance-report

## Requirements
- Environment: Vite.js utilizing plain JavaScript (no TypeScript).
- Architecture: 3-file feature-based separation (Service, Analytics, View).
- Table Integration: Comprehensive fetch of 'orders', 'expenses', and 'product_reviews' tables.
- Aggregate Accuracy: Precise calculation of Total Revenue, Operating Costs, Net Profit, and Weighted Sentiment."
- esilience: UI must remain functional during partial API failures (e.g., failed 'reviews' shouldn't hide 'orders').
- Verification: Unit tests using mocked Supabase responses to validate calculation edge cases.

## Metadata
- Programming Languages: JavaScript
- Frameworks: Vite
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
