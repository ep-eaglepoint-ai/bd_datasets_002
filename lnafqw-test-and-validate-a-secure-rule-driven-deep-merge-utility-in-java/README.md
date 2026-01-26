# LNAFQW - Test and Validate a Secure, Rule-Driven Deep Merge Utility in Java

**Category:** sft

## Overview
- Task ID: LNAFQW
- Title: Test and Validate a Secure, Rule-Driven Deep Merge Utility in Java
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lnafqw-test-and-validate-a-secure-rule-driven-deep-merge-utility-in-java

## Requirements
- Tests must be written in JUnit 5
- Single runnable test file
- Deterministic (no flaky or time-based tests)
- No skipped tests, no placeholders, no logging-based assertions
- Each test must clearly state the invariant it verifies (via comments or display names)
- Verify deep merging of Map, List, Set, and arrays
- Verify behavior when target is null, source is null, and both are non-null
- Verify that non-conflicting target data is preserved

## Metadata
- Programming Languages: Java
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
