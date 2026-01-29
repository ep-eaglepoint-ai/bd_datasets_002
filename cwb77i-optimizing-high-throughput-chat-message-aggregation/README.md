# CWB77I - Optimizing High-Throughput Chat Message Aggregation

**Category:** sft

## Overview
- Task ID: CWB77I
- Title: Optimizing High-Throughput Chat Message Aggregation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: cwb77i-optimizing-high-throughput-chat-message-aggregation

## Requirements
- Message addition must be safe from multiple concurrent goroutines without blocking the entire aggregator.
- Lock contention must be minimized (no single global mutex for all rooms).
- Flushing must collect batches per room atomically and efficiently.
- The Flush function must return a map of roomID to message batches without data races.
- All message additions must preserve order within each room.
- The implementation must handle thousands of concurrent AddMessage calls with low latency.
- No external libraries or channels that introduce unbounded growth are allowed.
- Original function signatures (AddMessage, Flush, StartFlusher) must be preserved
- The code must remain correct under concurrent Flush and AddMessage calls.

## Metadata
- Programming Languages: Go 1.2
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
