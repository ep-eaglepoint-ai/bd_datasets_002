# TJ1L95 - realtime-order-book-broadcast-engine

**Category:** sft

## Overview
- Task ID: TJ1L95
- Title: realtime-order-book-broadcast-engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tj1l95-realtime-order-book-broadcast-engine

## Requirements
- Implement a thread-safe data structure to manage the L2 state, supporting high-frequency updates for both 'Bids' (buy side) and 'Asks' (sell side).
- L2 Aggregation Logic: Incoming order events (Add, Update, Delete) must correctly modify the total volume at the corresponding price level; levels with zero remaining quantity must be immediately purged from the state.
- Synchronization Protocol: Implement a mechanism where new clients receive a full 'Snapshot' of the current top N price levels, followed by a sequence of 'Delta' updates representing incremental changes at specific price points.
- Sequence Integrity: Every broadcast message must contain a monotonically increasing sequence number to allow clients to detect gaps or out-of-order delivery.
- Adaptive Delta Merging: Within a single broadcast interval (e.g., 50ms), multiple changes to the same price level must be collapsed into a single delta representing the net state at the end of that interval.
- Backpressure Management: Implement an 'active-drop' or 'conflation' strategy for slow WebSocket consumers. If a client's outbound buffer reaches capacity, the system must merge pending deltas and skip intermediate states to prevent head-of-line blocking.
- Testing - Convergence: Create a test scenario where a 'Fast Client' and a 'Slow Client' (subject to simulated latency) are both verified to reach the exact same final state after a burst of 50,000 randomized orders.
- Testing - Concurrency: Use Go's race detector and stress tests to prove that the L2 aggregation logic is free of data races during simultaneous ingestion and broadcast reads.
- Adversarial Testing: Validate system resilience against 'order-book crossing' (where a bid is higher than an ask) and verify that the engine maintains its internal invariants without crashing.

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
