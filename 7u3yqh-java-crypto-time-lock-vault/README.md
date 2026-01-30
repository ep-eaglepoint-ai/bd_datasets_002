# 7U3YQH - java-crypto-Time-Lock-Vault

**Category:** sft

## Overview
- Task ID: 7U3YQH
- Title: java-crypto-Time-Lock-Vault
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7u3yqh-java-crypto-time-lock-vault

## Requirements
- Multi-Stage State Machine: Implement a state model with at least five states: `LOCKED`, `PENDING_WITHDRAWAL` (48-hour cool-down), `READY_FOR_RELEASE` (1-hour window), `RELEASED`, and `CANCELLED`.
- Temporal Window Enforcement: Use Java's `java.time` package to accurately track the 48-hour and 1-hour time gates. The system must automatically transition states when these timers expire.
- Atomic State Transitions: Ensure all state changes are thread-safe using `java.util.concurrent` locks or atomic references. A user should not be able to both cancel and confirm a withdrawal simultaneously.
- Idempotency: A `confirm` action must only succeed if the state is `READY_FOR_RELEASE`. A `cancel` action must only succeed if the state is `PENDING_WITHDRAWAL`.
- Testing Requirement (Happy Path): Write a test that simulates a user initiating a withdrawal, waiting 48 hours, and confirming within the 1-hour window. This will require mocking or controlling the system clock.
- Testing Requirement (Expiration): Simulate a scenario where a user initiates a withdrawal, waits 48 hours, but then fails to confirm within the final 1-hour window. Verify the state transitions back to `LOCKED` (or equivalent).
- Testing Requirement (Cancellation): Verify that a transaction in the `PENDING_WITHDRAWAL` state can be successfully moved to the `CANCELLED` state and cannot be confirmed thereafter.

## Metadata
- Programming Languages: Java
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
