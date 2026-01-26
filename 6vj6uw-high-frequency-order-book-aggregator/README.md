# 6VJ6UW - high-Frequency-Order-Book-Aggregator

**Category:** sft

## Overview
- Task ID: 6VJ6UW
- Title: high-Frequency-Order-Book-Aggregator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6vj6uw-high-frequency-order-book-aggregator

## Requirements
- The optimized component should process 100k updates/sec with a p99 latency under 500 microseconds.
- Eliminate the use of `Array.prototype.sort` and `Array.prototype.findIndex` within the hot path.
- Reduce heap allocations by at least 90% compared to the original implementation (measure via total bytes allocated per 1M updates).
- Data Shape: The component must continue to ingest updates with `{ side: 'buy'|'sell', price: number, quantity: number }`.
- Maintain the sorted order of bids (descending) and asks (ascending) at all times.
- Implementation must handle price levels with 4-decimal precision consistently.
- Testing Requirement: Provide a benchmark suite comparing the execution time of 10,000 updates between the original and optimized versions.
- Testing Requirement: Include a memory leak test that runs the aggregator for 5 minutes under load and verifies that the resident set size (RSS) remains stable.

## Metadata
- Programming Languages: TypeScript
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
