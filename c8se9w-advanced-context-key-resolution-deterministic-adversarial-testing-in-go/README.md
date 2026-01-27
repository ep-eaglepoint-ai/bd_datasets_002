# C8SE9W - Advanced Context Key Resolution: Deterministic, Adversarial Testing in Go

**Category:** sft

## Overview
- Task ID: C8SE9W
- Title: Advanced Context Key Resolution: Deterministic, Adversarial Testing in Go
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: c8se9w-advanced-context-key-resolution-deterministic-adversarial-testing-in-go

## Requirements
- Implement a full Go test suite for the provided keys package using the standard testing framework only.
- All tests must be deterministic and must pass under go test -race.
- Create controllable fakes for Clock and Metrics and assert both values and call ordering.
- Use table-driven tests and subtests to cover normal behavior and failure cases.
- Verify strict normalization rules including trimming, case-folding, alias resolution, FillUnknown behavior, and rejection of invalid or wildcard segments in Context
- Validate parsing rules for context keys, including exact segment count, wildcard legality, and invalid character handling.
- Test version comparison logic for numeric, mixed, empty, and non-numeric segments while asserting determinism rather than specific hash values.
- Prove MatchScore correctness with exact, wildcard, and version-prefix matches and confirm scoring and tie-breaking behavior.
- Thoroughly test LRUCache behavior, including promotion, eviction order, overwrite behavior, and capacity edge cases.
- Test Resolver end-to-end: add/remove semantics, deterministic best-match selection, cache hit/miss behavior, correct timestamps, error propagation, and stable results under concurrent access.

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
