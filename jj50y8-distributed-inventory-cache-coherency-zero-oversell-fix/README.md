# JJ50Y8 - Distributed Inventory Cache Coherency (Zero-Oversell) Fix

**Category:** sft

## Overview
- Task ID: JJ50Y8
- Title: Distributed Inventory Cache Coherency (Zero-Oversell) Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jj50y8-distributed-inventory-cache-coherency-zero-oversell-fix

## Requirements
- The system must ensure zero overselling under concurrency: a load test with 10,000 concurrent purchase attempts against stock=100 must produce exactly 100 successes and 9,900 failures, and inventory must never become negative, including the edge case of simultaneous “last item” purchases across servers.
- The application must guarantee read consistency for inventory queries: repeated reads within short intervals must not increase unless a legitimate restock/increment transaction occurred, handling rapid re-reads (e.g., within 50ms), mixed read/write traffic, and cache TTL boundaries without returning fluctuating values caused by races.
- The system must make writes visible to all cache readers within 100ms of commit, including scenarios with multiple app servers, in-flight requests, cache misses during transactions, and concurrent decrements and increments.
- Cache reads must meet performance targets: p99 inventory read latency must remain <5ms, and the system must sustain 10,000 requests/second mixed load, while preventing performance degradation that drops cache hit rate during write-heavy operations.
- The caching layer must maintain >90% cache hit rate under 10,000 req/s load, while handling cache-miss storms (thundering herd) and concurrent repopulation races when multiple servers miss the same key simultaneously.
- All inventory changes must be auditable: every inventory delta must produce an audit log entry containing timestamp, user, and delta, and audit logging must be written within the same database transaction as the inventory update to satisfy compliance requirements.
- The fix must be testable with deterministic concurrency scenarios and pass stress/verification tests that demonstrate the original oversell bug is eliminated in decrementStock, while correctly handling edge cases such as cache expiration during transactions, database deadlocks, network reordering, and interleaved increments/decrements.

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
