# Trajectory: User Session Analytics API
::# Trajectory: Java Session Analytics API Refactor

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: What must this API do, and what constraints apply?

Reasoning:
The objective is to refactor an existing Session Analytics API so it is stateless, thread-safe, single-pass O(n) for aggregation, uses declarative Bean Validation, separates validation from aggregation, and returns stable, machine-friendly error responses. The refactor must preserve the public API (paths/methods/response keys) and be demonstrably better than the `repository_before` implementation.

Key Requirements:
- **Stateless Controller**: `SessionAnalyticsController` must contain no mutable instance fields.
- **O(n) Single-pass Aggregation**: compute count, averageDuration, longestSession in one pass.
- **Bean Validation**: declarative annotations on the `Session` DTO (e.g., `@NotNull`, `@AssertTrue`) and a `ConstraintViolationException`-based rejection of invalid input.
- **Separation of Concerns**: validation must run separately from aggregation.
- **Stable Errors**: `ApiExceptionHandler` must return a stable JSON structure for validation errors.
- **No Shared Mutable State**: no cached sessions or mutable caches inside the controller.
- **Horizontally Scalable**: no reliance on in-memory shared state across requests.

Constraints Analysis:
- Keep original API surface: route paths and response keys must match expectations used by callers and tests.
- Tests must demonstrate that `repository_before` fails the requirements and `repository_after` passes.

### 2. Phase 2: QUESTION ASSUMPTIONS
**Guiding Question**: Are there simpler alternatives that still meet the goals?

Reasoning:
We avoid adding external frameworks to change high-level design. Simpler algorithmic fixes (remove nested loops, remove cached mutable fields) are preferred to large rewrites. Declarative validations via Bean Validation are standard and simpler than ad-hoc validation code.

### 3. Phase 3: DEFINE SUCCESS CRITERIA
**Guiding Question**: How do we prove 'done'?

Success Criteria:
1. `Session` uses declarative Bean Validation to reject `endTime < startTime`.
2. `SessionAnalyticsController` is stateless (no non-static mutable fields).
3. Aggregation algorithm is a single-pass O(n) over the input list computing `count`, `averageDuration`, and `longestSession`.
4. `ApiExceptionHandler` returns JSON like `{ "status":"error", "errors":[...] }` for validation failures.
5. `repository_before` fails the before-checks; `repository_after` passes all JUnit tests.
6. Dockerized test runners: `docker compose run --rm test-before` (fast, grep-based checks) fails; `docker compose run --rm test-after` runs Maven tests and passes.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Test Strategy)
**Guiding Question**: How will we prove correctness?

Test Strategy:
- **Static checks**: `tests/run_before.sh` performs quick grep-based checks on `repository_before` and prints per-test PASS/FAIL and totals (8 checks mirrored to the after-suite).
- **Unit tests**: `repository_after/src/test/java/com/example/sessions/*` includes `SessionAnalyticsControllerTest` and `AdditionalRequirementsTest` that validate behavior, Bean Validation, statelessness, and absence of cached state.
- **Integration-style runner**: `tests/run_after.sh` runs `mvn -f repository_after/pom.xml test` and parses Surefire XML to list per-test names and statuses.
- **Evaluation report**: `evaluation/EvaluationMain.java` produces `evaluation/yyyy-mm-dd/hh-mm-ss/report.json` summarizing before/after test results and environment details.

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: What minimal changes meet the criteria?

Components to implement or verify:
- `repository_after/src/main/java/.../Session.java` — DTO with `@NotNull` + `@AssertTrue` validation for end >= start.
- `repository_after/src/main/java/.../SessionAnalyticsController.java` — stateless controller, static final validator, single-pass aggregation, separate validation.
- `repository_after/src/main/java/.../ApiExceptionHandler.java` — stable JSON error responses.
- Tests under `repository_after/src/test/java/com/example/sessions/` validating the 10 requirements.
- `tests/run_before.sh` and `tests/run_after.sh` that produce per-test names and totals.
- `docker-compose.yml` services: `test-before`, `test-after`, and `evaluate`.

### 6. Phase 6: TRACE DATA / CONTROL FLOW
**Guiding Question**: How does a request flow end-to-end?

Request flow (POST /api/sessions/analyze):
1. Request body deserialized to `List<Session>`.
2. Declarative Bean Validation runs; violations raise `ConstraintViolationException`.
3. `ApiExceptionHandler` converts violations to stable JSON error body.
4. If valid, controller performs a single-pass aggregation:
	- Accumulate `totalDuration`, `count`, track `longestSession` in one loop.
	- Compute `averageDuration = totalDuration / count`.
5. Controller returns a `Map<String,Object>` with `count`, `averageDuration`, `longestSession`.

### 7. Phase 7: ANTICIPATE OBJECTIONS
**Guiding Question**: What can go wrong or be challenged?

Objections & Responses:
- "Why not cache sessions for performance?" — Caching in controller leads to shared mutable state, breaking statelessness and horizontal scalability.
- "Is one-pass aggregation accurate?" — Yes; average and longest can be computed in one pass using running totals and a max check.
- "Why Bean Validation?" — Declarative validation centralizes rules and integrates with `ConstraintViolationException` for consistent handling.

### 8. Phase 8: VERIFY INVARIANTS / CONSTRAINTS
**Guiding Question**: What must always hold?

Invariants:
- No `cachedSessions` or other mutable instance fields in `SessionAnalyticsController`.
- No nested loops that iterate `sessions` twice (no O(n^2) patterns like `for (int i...)` + `for (int j...)`).
- `validator` is `static final` or equivalent to avoid per-request reallocation.
- Error responses for validation follow the shape: `{"status":"error","errors":[...]} `.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
**Guiding Question**: What is the minimal, safe order of changes?

1. Add `Session` DTO with Bean Validation in `repository_after` (low risk).
2. Implement `ApiExceptionHandler` to map `ConstraintViolationException` to stable JSON (low risk).
3. Implement stateless `SessionAnalyticsController` with a static validator and single-pass aggregation (medium risk).
4. Add unit tests that assert the 10 requirements (`SessionAnalyticsControllerTest`, `AdditionalRequirementsTest`) (low risk).
5. Add `tests/run_before.sh` and `tests/run_after.sh` and wire `docker-compose.yml` to run both in containers (low risk).
6. Add `evaluation/EvaluationMain.java` and `evaluate` service to generate `report.json` (low risk).

### 10. Phase 10: MEASURE IMPACT / VERIFICATION
**Guiding Question**: How do we prove the refactor succeeded?

Validation steps:
- Run `docker compose run --rm test-before` — must fail and show 8 checks, with the failing ones pointing at issues in `repository_before`.
- Run `docker compose run --rm test-after` — must run Maven tests and print each test name and status; all tests should pass.
- Run `docker compose run --rm evaluate` — produces `evaluation/yyyy-mm-dd/hh-mm-ss/report.json` (ignored via `.gitignore`) summarizing before/after results and per-test entries.

### 11. Phase 11: DOCUMENT DECISIONS AND TRADE-OFFS
**Problem**: Legacy controller with mutable state and O(n^2) loops prevents safe horizontal scaling and violates validation best-practices.

Solution Summary:
- Move to stateless controllers, declarative validation, single-pass aggregation, and stable error responses. The `repository_after` branch demonstrates these changes with unit tests and CI-friendly containers.

Trade-offs & When to Revisit:
- The refactor intentionally avoids adding external frameworks; if the project needs advanced features (caching, distributed aggregation), re-evaluate for a proper caching layer or stream processing.
- If performance becomes a bottleneck at very large input sizes, consider streaming inputs or summary data pre-aggregation upstream.

### 12. Appendix: Quick Commands
- Run before-check (fast):
```
docker compose run --rm test-before
```
- Run after-check (Maven, full tests):
```
docker compose run --rm test-after
```
- Generate evaluation report JSON:
```
docker compose run --rm evaluate
```

---

This trajectory captures why the changes were made, how they are validated, and the measurable success criteria. It can be updated as the repo evolves.

