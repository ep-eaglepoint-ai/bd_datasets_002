# 1NE6AD - Optimizing fetch_user_activity_summary Performance

**Category:** sft

## Overview
- Task ID: 1NE6AD
- Title: Optimizing fetch_user_activity_summary Performance
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1ne6ad-optimizing-fetch-user-activity-summary-performance

## Requirements
- Latency Target: Achieve a p99 response time of <200ms for datasets up to 1,000,000 records.
- Memory Efficiency: Reduce application-layer memory footprint by 80% (max 128MB resident set size).
- Infrastructure Constraints: Strict prohibition on modifying database schemas or adding new indexes.
- Logic Optimization: Eliminate O(N) in-memory set lookups and repetitive type casting within loops.
- Functional Parity Test: Provide a unit test demonstrating that the optimized output is identical to the original logic's output for complex nested metadata.
- Performance Benchmark: Include a profiling script that compares execution time and memory delta between the legacy and refactored versions.
- Scalability Verification: Prove via a load test that memory usage remains constant (O(1) or O(log N)) regardless of the number of events fetched.
- The Reporting Dashboard API suffers from linear memory growth (O(N)) and high CPU overhead because it performs manual in-memory de-duplication and aggregation of large datasets, causing timeouts for users with over 50,000 events.

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
