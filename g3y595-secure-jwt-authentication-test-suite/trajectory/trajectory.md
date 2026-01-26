# Trajectory: how to solve this JWT auth testing problem

## 1) Audit the current state (find the real constraints)

- Identify what is “system under test” vs “test harness”:
  - `repository_before/` is the app and auth logic.
  - `repository_after/` is where the Jest + RTL suite must live.
  - `tests/` contains the meta tests.
- List practical constraints up front:
  - Meta test must be mutation-style: it should fail only if the real suite is weak.
- Note common bottlenecks early:
  - React/Jest module resolution across two folders.
  - Docker bind-mounts hiding `node_modules`.
  - Jest/RTL async timing issues (fake timers, queued promises).

## 2) Define the contract (acceptance criteria)

- Security flow guarantees the tests must enforce:
  - Concurrent refresh prevention (one refresh for many requests).
  - Token reuse detection → revoke refresh family.
  - Request queue + retry after refresh.
  - Proactive refresh before expiry.
- UI/auth guarantees:
  - Login success/failure behaviors.
  - Logout clears session.
  - Protected route requires auth.
  - Demo credentials text appears.
- Test-suite requirements:
  - Each test includes a comment indicating which requirement it validates.
  - Meta tests must “prove” robustness by breaking code and expecting the suite to fail.
  - Provide 3 short docker commands: run suite, run meta, run evaluation.

## 3) Redesign the structure (high-leverage testability change)

- Keep app behavior untouched, but add a minimal export hook so tests can reliably observe internal auth state:
  - Export the auth backend / http client instance via a `__testExports` object.
  - This avoids brittle DOM-only assertions for security flows.
- Place all testing infrastructure in `repository_after/`:
  - Jest config, setup (including module mocks), TS config, and the test files.

## 4) Minimal execution pipeline (make tests deterministic)

- Test layers:
  - Logic-level tests: directly exercise the exported auth client/backend to validate refresh, queueing, and theft detection.
  - UI-level tests: render the app with RTL and validate login/logout/protected routing.
- Determinism rules:
  - Use `jest.useFakeTimers()` where timing matters (expiry/proactive refresh).
  - Attach promise rejections before advancing timers (avoid unhandled rejections).
  - Reset singleton/shared state between tests (don’t rely on `jest.resetModules()` if it causes multiple-React “invalid hook call” issues).

## 5) Push work to the right layer (container + config)

- Solve module resolution at the configuration layer instead of hacks in individual tests:
  - Ensure React deps resolve from a single `node_modules`.
  - Mock non-critical UI deps (e.g., icons) in Jest setup.
- In Docker, prefer “copy into image” over bind-mounting the whole repo when it causes dependency shadowing.
  - Copy `repository_before/`, `repository_after/`, `tests/`, and `evaluation/` into the image.
  - Mount only `evaluation/reports/` if you need outputs on the host.

## 6) Eliminate pathological patterns (meta tests that can’t be cheated)

- Meta tests should not re-implement logic; they should validate the _real suite’s power_.
- Approach:
  - Create mutated versions of the app module (disable theft detection, remove queueing, bypass protected route, etc.).
  - Run the real Jest suite against the mutated module.
  - Assert: suite exits non-zero (i.e., detects the bug).
- Cover “most requirements” with a small set of high-signal mutations rather than many low-value ones.

## 7) Verify against the contract (and keep commands usable)

- Confirm locally that:
  - Main suite passes on the unmodified implementation.
  - Each mutation causes the suite to fail.
