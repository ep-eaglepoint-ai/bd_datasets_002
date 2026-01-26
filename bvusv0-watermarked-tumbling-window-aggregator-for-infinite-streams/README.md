# BVUSV0 - Watermarked Tumbling Window Aggregator for Infinite Streams

**Category:** sft

## Overview
- Task ID: BVUSV0
- Title: Watermarked Tumbling Window Aggregator for Infinite Streams
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: bvusv0-watermarked-tumbling-window-aggregator-for-infinite-streams

## Requirements
- The class must explicitly delete or remove data buckets associated with a window after that window results are emitted. Keeping history grows memory linearly and is a failure.
- The code must track max_timestamp seen. If event_time < max_timestamp - allowed_lateness, the event must be dropped.
- The window result must only be yielded when the watermark passes the window end time. Yielding a result immediately for every point (running average) is a logic failure.
- No Pandas/Numpy: Usage of any dataframe library is an immediate failure as per constraints.
- Tumbling Windows: Events must be grouped by timestamp // 60. Overlapping windows (sliding) or incorrect modulo arithmetic is a failure
- The input must be treated as an iterator. Attempting to run list(input_stream) or sorted(input_stream) loads all data into RAM and fails the streaming requirement.
- The loop must wrap JSON parsing in a try/except block. If a malformed line crashes the aggregator, it fails.
- The output must be the arithmetic mean of all valid events in that specific 60-second slot. Integer division results (truncation) for float values is a failure.

## Metadata
- Programming Languages: Python 3.10+
- Frameworks: (none)
- Libraries: Json collection
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
