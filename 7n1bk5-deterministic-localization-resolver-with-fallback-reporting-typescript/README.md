# 7N1BK5 - Deterministic Localization Resolver with Fallback Reporting (TypeScript)

**Category:** sft

## Overview
- Task ID: 7N1BK5
- Title: Deterministic Localization Resolver with Fallback Reporting (TypeScript)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7n1bk5-deterministic-localization-resolver-with-fallback-reporting-typescript

## Requirements
- Must expose resolveLocalizedString(input) and return a success or failure result in a consistent structured shape
- Must record every locale that was attempted, in order, as fallbackPath  ,  fallbackPath must be returned on both success and failure
- Missing translation key must be reported as MISSING_TRANSLATION
- Locale not found in map must be reported as UNKNOWN_LOCALE
- Locale matching must be exact string matching

## Metadata
- Programming Languages: TypeScript (Node.js runtime, no external libraries)
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
