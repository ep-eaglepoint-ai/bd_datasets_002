# GSXZL5 - multiTieredTrafficControlSystem

**Category:** sft

## Overview
- Task ID: GSXZL5
- Title: multiTieredTrafficControlSystem
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gsxzl5-multitieredtrafficcontrolsystem

## Requirements
- Implement a dual-layer quota system: IP-based limits for anonymous traffic and UserID-based limits for authenticated traffic.
- Use an efficient rate-limiting algorithm (e.g., Token Bucket or Sliding Window Log) to manage burst and sustained traffic levels.
- Implement a reputation-based 'Ban' mechanism: any entity violating the rate limit 5 times in 60 seconds must be blacklisted for 30 minutes (HTTP 403).
- The rate-limiting logic must maintain a P99 latency of <2ms per request under a load of 2,000 RPS.",       "All state transitions (increments, window sliding, and ban status updates) must be atomic and thread-safe.
- Every response must include standard headers: X-RateLimit-Limit, X-RateLimit-Remaining, and Retry-After (in seconds).
- Testing: Simulate a transition from 200 (Success) to 429 (Limited) and then to 403 (Banned) for a single IP.
- Testing: Verify that an authenticated user remains unblocked even if originating from a banned IP (identity-priority validation).
- Testing: Demonstrate that the in-memory store remains bounded and does not leak memory under an 10,000+ unique IP simulation.

## Metadata
- Programming Languages: python
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
