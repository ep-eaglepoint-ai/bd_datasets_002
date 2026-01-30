# F6ESGE - high-contention-connection-pool-stress-test

**Category:** sft

## Overview
- Task ID: F6ESGE
- Title: high-contention-connection-pool-stress-test
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f6esge-high-contention-connection-pool-stress-test

## Requirements
- Thread-Safety Verification: Implement a stress test using at least 50 concurrent threads that perform 1,000 borrow/release cycles each. Verify that the pool's internal count of 'active' connections never exceeds the defined maximum and never drops below zero.
- Timeout Enforcement: Validate that a thread requesting a connection from an exhausted pool is blocked for exactly the duration of the acquisitionTimeout before receiving a TimeoutException or null response.
- Interruption Resilience: Write a test case where a thread is interrupted while waiting for a connection. Verify that the pool handles the InterruptedException gracefully and does not leave the internal semaphore or counter in a corrupted state.
- Resource Leak Detection: Implement a 'Leak Check' that verifies the total number of connections (Active + Available) remains equal to the initial pool size after all threads have completed their work and returned resources.
- Edge-Case Coverage: Assert the behavior of the pool when initialized with a size of 1 or when a connection is released multiple times by a buggy worker (idempotency check).
- Testing Requirement (Lifecycle): Ensure the shutdown() method correctly terminates all idle connections and prevents further acquisitions, failing any pending requests immediately
- Testing Requirement (Coverage): Utilize a coverage tool like JaCoCo to ensure that 100% of the borrow and release logic paths, including all exception catch blocks, are exercised.
- Testing Requirement (Concurrency): Use a CountDownLatch to ensure all 50 threads begin their acquisition attempts at the exact same millisecond to maximize the probability of exposing race conditions.

## Metadata
- Programming Languages: Java
- Frameworks: JUnit 5
- Libraries: java.util.concurrent
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: Lock Contention, Acquisition Latency
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
