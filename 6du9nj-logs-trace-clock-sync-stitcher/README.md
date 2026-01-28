# 6DU9NJ - logs-trace-clock-sync-stitcher

**Category:** sft

## Overview
- Task ID: 6DU9NJ
- Title: logs-trace-clock-sync-stitcher
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6du9nj-logs-trace-clock-sync-stitcher

## Requirements
- Graph Reconstruction: Take an array of `Event {id, parent_id, timestamp_ms, name}` and return a nested object showing the hierarchical relationship.
- Clock-Skew Normalization: If `child.timestamp < parent.timestamp`, calculate `drift = parent.timestamp - child.timestamp + 1`. Add this `drift` to the child and all of the child's own descendants.
- Duration Integrity: The total execution time of a child span (`end - start`) must remain unchanged after the normalization shift.
- Out-of-Order Handling: The input list of events is not sorted; the logic must correctly identify root nodes (where `parent_id` is None/empty).
- Dependency Detection: Identify and flag 'Broken Chains'—child events that refer to a `parent_id` that does not exist in the dataset.
- Data Shape: `Event` objects have millisecond precision (integers).
- Testing Requirement: Provide a test case where a child event starts 10ms 'before' its parent. Verify the output shifts the child to start 1ms 'after' the parent and that all subsequent children in that branch are shifted by the same 11ms delta.
- Testing Requirement: Write a test that detects a 'Cycle' (A depends on B, B depends on A) and raises a specific `CircularTraceError`.

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
