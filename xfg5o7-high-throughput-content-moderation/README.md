# XFG5O7 - High-Throughput Content Moderation

**Category:** sft

## Overview
- Task ID: XFG5O7
- Title: High-Throughput Content Moderation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xfg5o7-high-throughput-content-moderation

## Requirements
- Decoupled Complexity: The solution must scale the blocklistRules array from 1,000 to 50,000+ entries with negligible impact on per-event processing time. (Naive loop scans or massive Regex alternations that degrade with size are not acceptable).
- Correctness & Overlaps: The logic must preserve the exact filtering behavior of the original code. Specifically, if a message contains text that matches multiple rules (e.g., "superman" matches both "super" and "man"), all relevant rules must be detected and aggregated. Solutions that consume the string (like standard Regex matching) and miss overlapping tokens will fail.
- Zero-Allocation Hot Path: The iteration loop must be garbage-free. You must verify that new Date(), new RegExp(), and JSON.parse/stringify are not called for every event.
- Performance SLA: The refactored solution must process a batch of 10,000 events against 50,000 active rules in under 250 milliseconds on a standard single-core Node.js runtime.
- Standard Library Only: The implementation must use standard JavaScript (ES2022+) features. No external libraries (like lodash) or native C++ addons are permitted.

## Metadata
- Programming Languages: Javascript(Node.js 20+)
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
