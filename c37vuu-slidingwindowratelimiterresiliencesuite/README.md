# C37VUU - slidingWindowRateLimiterResilienceSuite

**Category:** sft

## Overview
- Task ID: C37VUU
- Title: slidingWindowRateLimiterResilienceSuite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: c37vuu-slidingwindowratelimiterresiliencesuite

## Requirements
- Utilize 'pytest' as the primary test runner and 'hypothesis' for property-based (generative) testing.
- Verify the 'Rolling Window' property: For any randomly generated sequence of 1,000 request timestamps, the suite must prove that no sub-sequence spanning exactly 60 seconds contains more than 'max_requests'.
- Adversarial Temporal Testing: Test behavior with out-of-order timestamps and micro-second gaps to ensure the limiter logic does not assume perfectly chronological ingestion.
- Memory Leak Verification: Prove that the 'cleanup' or 'purge' logic effectively removes timestamps older than the window, ensuring the internal data structure does not grow indefinitely under constant traffic.
- Edge Case Validation: Test the exact boundaries of the window (e.g., a request at T=0 and a request at T=60.000001) to verify float precision handling.
- Mocking and Isolation: The tests must strictly isolate the limiter logic from the system clock by injecting a controlled time source.
- State Consistency: Verify that rejected requests (429-style responses) do not erroneously increment the counter or consume a window slot.
- Negative Testing: Simulate an 'unstable' state where the underlying storage (simulated here as an internal list) returns unexpected types or empty values.

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
