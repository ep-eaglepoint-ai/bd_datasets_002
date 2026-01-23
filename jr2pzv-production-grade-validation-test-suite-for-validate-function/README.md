# JR2PZV - Production-Grade Validation Test Suite for Validate Function

**Category:** sft

## Overview
- Task ID: JR2PZV
- Title: Production-Grade Validation Test Suite for Validate Function
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jr2pzv-production-grade-validation-test-suite-for-validate-function

## Requirements
- Tests must be written in Go using the standard testing package only
- All tests must be table-driven and executed with t.Run
- No duplicated test logic outside the table loop
- Boundary cases for MinLength must include exactly at, just below, and just above
- Empty, whitespace-only, and trimmed inputs must be tested
- Lenient mode may suppress exactly one short-input violation and no others
- Meaningful combinations of policy flags must be covered without brute-forcing all combinations
- FailFast must always return the earliest failing validation error
- When multiple rules fail, error precedence must be deterministic and consistent
- SQL injection detection must be validated, including normalization-dependent cases
- Business-hours validation must use a fake clock only
- Every failing case must explicitly fail the test

## Metadata
- Programming Languages: Go
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
