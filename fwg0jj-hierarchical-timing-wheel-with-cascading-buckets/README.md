# FWG0JJ - Hierarchical Timing Wheel with Cascading Buckets

**Category:** sft

## Overview
- Task ID: FWG0JJ
- Title: Hierarchical Timing Wheel with Cascading Buckets
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: fwg0jj-hierarchical-timing-wheel-with-cascading-buckets

## Requirements
- The solution must use multiple arrays/slices (wheels) representing different time granularities (e.g., Level 1: 0-100ms, Level 2: 100ms-10s, etc.).
- This is the specific "Trap." When Advance() ticks the clock and an index wraps around on a lower wheel, the code must look at the next slot in the higher wheel, remove those tasks, and re-add them to the lower wheel. If the code simply executes them, it is wrong.
- The code must not use time.Sleep or time.NewTicker. It relies entirely on the Advance(delta) argument to update its internal currentTime state
- If a task delay is larger than the sum of all wheels (e.g., delay = 10 years), it must be put in a special overflow list or the largest wheel's special bucket, and checked only when the largest wheel wraps.
- Schedule returns an ID or function. Calling it must remove the task from whichever bucket it currently resides in (O(1) removal, usually via a Doubly Linked List inside the bucket).
- When a task cascades from Level N down to Level N-1, the system must calculate its new slot based on the remaining time (deadline - current_time), not the original delay. Simply using the original duration will place the task in the wrong slot relative to the current virtual clock.
- If the lowest-level wheel has a tick resolution of 10ms, and a user schedules a task for 15ms, the logic must strictly round up to 20ms (2 ticks). Firing early (at 10ms) is a critical timing violation.

## Metadata
- Programming Languages: Go (Golang 1.18+)
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
