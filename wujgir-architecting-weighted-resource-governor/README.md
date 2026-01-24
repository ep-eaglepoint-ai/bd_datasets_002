# WUJGIR - Architecting-Weighted-Resource-Governor

**Category:** sft

## Overview
- Task ID: WUJGIR
- Title: Architecting-Weighted-Resource-Governor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wujgir-architecting-weighted-resource-governor

## Requirements
- Design and implement a 'Cost Resolution Engine' that maps incoming request attributes (methods, paths, or header metadata) to a numeric cost weight. The mapping logic must handle overlapping patterns using a 'most-specific-match' priority.
- Develop a distributed state management strategy that utilizes atomic increments and compare-and-swap (CAS) operations against a provided persistence interface to ensure 'Exactly-Once' unit deduction across concurrent nodes.
- Implement a 'Variable Refill' algorithm: tenants must accumulate 'Resource Units' at a sustained rate, but the system must allow for configurable 'Burst Buffers' that let tenants exceed their rate for short intervals if they have prior idle time.
- The system must return a precise 'Cooldown' duration on rejection. This value must be calculated based on the specific unit-cost of the failed request and the tenant's current refill velocity, rather than a static timeout.
- The implementation must be optimized for extreme concurrency, aiming for a zero-lock or highly-sharded architecture that can sustain 100,000 unit-checks per second per instance without significant GC pressure.
- Testing: Author a comprehensive validation suite. Include a multi-threaded stress test where 100 goroutines simulate a single tenant attempting to exhaust a quota across 'distributed' nodes. Verify that the total units consumed never exceed the defined limit by even a single unit. Include a test verifying that high-cost requests are throttled significantly earlier than low-cost requests under identical load profiles.

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
