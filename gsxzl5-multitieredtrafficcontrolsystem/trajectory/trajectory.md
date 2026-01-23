# Trajectory

## 1. Exploration and Planning
- **Goal**: Upgrade `api_server.py` to implement rate limiting and reputation engine.
- **Initial State**: The repository contained a basic server in `repository_before` with no rate limiting.
- **Analysis**:
    - Identified requirements: Dual-layer quotas (IP/User), Ban system, Reputation Engine, Thread Safety.
    - Planned implementation steps:
        1. Copy base code to `repository_after`.
        2. Implement `RateLimiter` class with Token Bucket algorithm.
        3. Implement `ReputationEngine` class for scoring.
        4. Integrate both into `APIServer`.
        5. Add thread safety with `threading.RLock`.

## 2. Implementation
- **Step 1: Baseline**: Copied `repository_before/api_server.py` to `repository_after/api_server.py`.
- **Step 2: Rate Limiter**:
    - Implemented `RateLimiter` using Token Bucket.
    - Defined default capacities: 100 (IP), 1000 (User).
    - Added `refill_rate` logic.
- **Step 3: Ban Mechanism**:
    - Added violation tracking (`bucket['violations']`).
    - Implemented 5-violation threshold triggering a 30-minute ban (403 Forbidden).
- **Step 4: Reputation Engine**:
    - Created `ReputationEngine` class.
    - Implemented logic to penalize score by 20 points on failed login (401).
    - Integrated dynamic capacity adjustment: if score < 50, capacity drops to 10.
- **Step 5: Headers**:
    - Added `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

## 3. Testing and Verification
- **Test Suite Creation**:
    - Created 23 tests covering functional, edge case, and strict rate-limiting scenarios.
    - Key tests: `test_rate_limiter.py`, `test_reputation_engine`, `test_auth_priority.py`, `test_concurrency.py`, `test_memory_bounds.py`.
- **Refinement**:
    - Iterate on tests to ensure `repository_before` fails correctly (strict enforcement).
    - Fixed strictness logic in checks to ensure 200 OK is NOT accepted when 429/403 is expected.
    - Cleaned up pytest warnings (`PytestReturnNotNoneWarning`).
- **Debugging**:
    - Fixed logic in `test_rate_limiter.py` to correctly test IP limits and reputation draining.
    - Integrated `ReputationEngine` into `APIServer` after initial test failure revealed it was missing.
    - Fixed `evaluation.py` encoding issues on Windows.
    - Added logic to clean up `/tmp/BUILD_FAILED_*` markers to prevent CI false positives.

## 4. Final Results
- **Repository Before**:
    - **Passed**: 13/23 tests (Functional tests verified base logic).
    - **Failed**: 10/23 tests (Rate limiting, Bans, Headers, Reputation - Expected).
- **Repository After**:
    - **Passed**: 23/23 tests.
    - **Status**: Verified Correct.

## 5. Deliverables
- **Code**: `repository_after/api_server.py` (Full implementation).
- **Tests**: `tests/*.py` (Comprehensive suite).
- **Report**: `evaluation/report.json`.
- **Patch**: `patches/diff.patch`.
