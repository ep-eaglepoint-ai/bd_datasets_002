# 21XFJF - AuditLogger Test Coverage

**Category:** sft

## Overview
- Task ID: 21XFJF
- Title: AuditLogger Test Coverage
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 21xfjf-auditlogger-test-coverage

## Requirements
- Verify that when the random value is greater than or equal to sampleRate, no log entry is created.
- Verify that when the random value is less than sampleRate, exactly one log entry is created.
- Verify that when more than maxEntries requests are logged, the oldest entries are evicted and only the most recent entries remain.
- Verify that when deduplication is enabled, logging the same effective snapshot twice results in only one stored log entry.
- Verify that when deduplication is disabled, identical snapshots are logged multiple times.
- Verify that redaction rules replace matched values with [REDACTED] or a custom replacement.
- Verify that hashing rules replace matched values with deterministic [HASH:...] values.
- Verify that when maxApproxBytes is set very small, large inputs are truncated.
- Verify that meta.truncated is set to true.
- Verify that the output data contains truncation markers (e.g. __truncated, __more, or __moreKeys).

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
