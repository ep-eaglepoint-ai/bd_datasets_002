# Trajectory

# Trajectory

1. **Test Strategy Design**: Decided to use a `FakeKeyValueStore` for deterministic state management and explicit timestamp injection (`now` argument) to eliminate flaky, time-dependent behavior in tests.

2. **Test Suite Implementation**: Implemented `repository_after/rate_limiter_test.py` covering all critical scenarios: initial requests, counter increments, limit exhaustion (429), and window resets.

3. **Dependency Isolation**: Copied `rate_limiter.py` into `repository_after/` and updated imports to use `sys.path` appending. This ensured the test suite was self-contained and could be easily moved or sandboxed by the meta-test.

4. **Meta-Test Development (Mutation Testing)**: Created `tests/test_meta.py` to verify the test suite's quality. This script runs the user's test suite against 4 intentionally broken implementations (Mutants) and asserts that the suite correctly fails, proving it can catch bugs.

5. **Resource Creation**: Created 5 distinct versions of the rate limiter logic (1 correct, 4 broken) in `tests/resources/` to serve as inputs for the meta-test runner.

6. **Evaluation Pipeline**: Built `evaluation/evaluation.py` to orchestrate the entire process inside Docker, running both the functional tests and the meta-tests, then aggregating the results into a JSON report.