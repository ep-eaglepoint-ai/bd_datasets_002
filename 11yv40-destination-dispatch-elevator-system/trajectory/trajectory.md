# Trajectory: Destination Dispatch Elevator System


### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What must this elevator controller do, and under what constraints?"

**Reasoning**:
The project implements a deterministic destination-dispatch elevator controller in Go that is safe under concurrency, easy to test, and reproducible inside a containerized test harness. It must be educational and verifiable: deterministic assignment heuristics, simple movement simulation, and robust concurrency invariants.

**Key Requirements**:
- **Thread-safety**: `Controller` state must be protected (use `sync.RWMutex`).
- **Deterministic Scheduling**: assignment must be deterministic (no randomness) and explainable.
- **Capacity Safety**: never allow car load to exceed `MaxCapacity` (atomic boarding).
- **Movement Simulation**: cars advance one floor per tick; doors enforce dwell.
- **Immediate API**: `RequestRide(from,to)` returns assigned car id immediately; `RequestAndBoard` performs atomic assign+board.
- **Testability & CI**: tests run `go test -v` (race on host), and an `evaluation` tool writes JSON reports to `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`.
- **Containerization**: `docker-compose` orchestrates `test-after` and `evaluate` using the repo root `Dockerfile` (Go 1.18 stage).

**Constraints**:
- Use Go 1.18 (project requirement).
- No external scheduling services or random tie-breaking.
- Tests must be runnable with `go test -race` on developer host; evaluator runs tests without `-race` inside its container (CGO constraints).

### 2. Phase 2: QUESTION ASSUMPTIONS
**Guiding Question**: "Are simpler options acceptable while satisfying requirements?"

**Reasoning**:
Deterministic heuristics (distance + large direction-penalty + ID tiebreak) are simpler and safer for reproducible tests than an optimal but non-deterministic scheduler. Simpler movement simulation (1 floor/tick, door dwell) is sufficient to validate timing-related tests.

**Scope Refinement**:
- Keep assignment heuristic simple but documented.
- Make boarding atomic rather than attempting optimistic concurrency that is fragile under high concurrency.

### 3. Phase 3: DEFINE SUCCESS CRITERIA
**Guiding Question**: "How do we measure 'done'?"

Success Criteria:
1. `Controller` compiles and exports `NewController()`, `RequestRide(from,to)`, `RequestAndBoard(from,to)` and `OpenDoors(carID,ticks)`.
2. All unit and integration tests in `tests/after` pass.
3. `RequestAndBoard` preserves capacity invariant under concurrent requests (test asserts load <= MaxCapacity).
4. Movement/dwell tests assert correct timing (one floor/tick) and no movement while doors open.
5. Evaluator writes a JSON report under `evaluation/YYYY-MM-DD/HH-MM-SS/report.json` that includes per-test entries and summary counts.
6. Docker workflow: `docker compose build test-after` and `docker compose run --rm test-after` execute tests and exit with success.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Test Strategy)
**Guiding Question**: "How will we prove correctness and completeness?"

Test Strategy:
- **Unit Tests** (`tests/after/*.go`):
  - `controller_test.go`: concurrent readers + basic getters.
  - `request_test.go`: invalid/valid floor validation for `RequestRide`.
  - `assignment_test.go`: deterministic assignment, tie-breaks, capacity penalization, direction momentum.
  - `concurrent_board_test.go`: many goroutines calling `RequestAndBoard`, assert capacity invariant.
  - `movement_test.go` and `dwell_test.go`: timing and door dwell behavior.
- **Integration**: `docker compose run --rm test-after` runs the test runner script and prints verbose test output; evaluator parses it into JSON.
- **Evaluator Validation**: `evaluation/evaluation.go` produces a JSON file containing `results.after.tests` array with `name`, `status`, `duration_ms`, and `failureMessages`.

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: "What minimal components fulfill requirements?"

Components to create or verify:
- `tests/elevator` (package): `controller.go`, `car.go`, `movement.go`, `errors.go`, `heuristics.go` — thread-safe controller and car model.
- `tests/after` (tests): unit + integration tests described above.
- `evaluation/evaluation.go`: runs the test runner (`tests/run_tests.sh`), parses `go test -v` output, and writes timestamped JSON report.
- `Dockerfile` (root): multi-stage; `golang:1.18-alpine` stage runs Go tests; `docker-compose.yml` services `test-after` (build target `golang`) and `evaluate`.
- `tests/run_tests.sh`: runs `go test -v ./after/...` and prints a summary; supports `NO_RACE=1` for evaluator container.

### 6. Phase 6: TRACE DATA / CONTROL FLOW
**Guiding Question**: "How does a request flow through the system?"

RequestRide Flow:
User (test) → call `Controller.RequestRide(from,to)` → validate floors → attempt `assignCar(from,to)` under read lock → if found return ID; otherwise create new car under write lock and return new ID.

RequestAndBoard Flow:
User (concurrent) → call `Controller.RequestAndBoard(from,to)` → validate floors → acquire write lock → `assignCarLocked(from,to)` → if car found and capacity allows increment `Load` atomically and return ID; otherwise create new car with `Load=1`.

Movement/Doors Flow:
`StartMovement(tick)` goroutine → each tick: for each car under write lock, if `DoorDwellTicks>0` decrement and keep doors open; else move one floor depending on `Direction` and decrement pending stops; doors open logic used for boarding tests.

Evaluator Flow:
`evaluation` runs `cd tests && NO_RACE=1 sh run_tests.sh` → captures `=== RUN` and `--- PASS/FAIL` lines → builds JSON report and writes under `evaluation/YYYY-MM-DD/HH-MM-SS/report.json` so host can read it.

### 7. Phase 7: ANTICIPATE OBJECTIONS / TRADE-OFFS
**Guiding Question**: "What could go wrong and why these choices?"

Objection 1: "Deterministic heuristic is not optimal."
- Counter: Determinism is required for reproducible testing; a pluggable heuristic interface can be added later for optimization.

Objection 2: "Movement simulation is simplified." 
- Counter: The simulation is intentionally minimal (1 floor/tick) to make timing tests deterministic and easy to reason about.

Objection 3: "No persistence / real scheduler." 
- Counter: This project is an in-memory controller with tests focused on logic. Persistence or distributed scheduling is out-of-scope for now.

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What invariants must hold?"

Must-hold invariants:
- **Capacity invariant**: For any car, `Load` <= `MaxCapacity`. Tests must assert this after concurrent boarding.
- **Atomicity**: `RequestAndBoard` must be atomic (Lock held across assignment + increment).
- **Determinism**: `assignCar` must produce the same chosen `car.ID` given identical state.
- **No movement while doors open**: `DoorDwellTicks>0` prevents floor movement that tick.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
1. Implement and test `Controller` skeleton with RW locking and safe getters. (Low risk)
2. Implement deterministic `assignCar` (distance + direction penalty + ID tie-break). Add unit tests. (Low risk)
3. Implement `RequestRide` and `RequestAndBoard` with proper validation and atomic boarding tests. (Medium risk)
4. Implement `StartMovement` and door dwell logic; add timing tests. (Medium risk)
5. Add evaluator script (`evaluation/evaluation.go`) that runs `tests/run_tests.sh`, parses verbose output, and writes JSON. (Low risk)
6. Wire up `docker-compose.yml` to build `test-after` from `Dockerfile` `golang` stage and run `test-after` and `evaluate`. (Low risk)
7. Run CI locally: `docker compose build test-after` then `docker compose run --rm test-after` then `docker compose run --rm evaluate`. (Verification)

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "How will we measure success?"

Metrics:
- Test suite passes: `go test -v ./after/...` (host) and `NO_RACE=1` inside evaluator container.
- Evaluator JSON includes `results.after.tests` entries and an accurate `summary` with `total`, `passed`, `failed`.
- Race checks: run `go test -race` locally for additional validation (CI may run full race-enabled tests).
- Deterministic assignment reproducibility is validated by unit tests asserting exact selected IDs for given states.

### 11. Phase 11: DOCUMENT THE DECISION
**Problem**: Provide a deterministic, testable elevator destination-dispatch controller implemented in Go and verified by containerized tests and an evaluator.

**Solution**: Implement a lock-protected `Controller` with deterministic assignment, atomic boarding, simple movement simulation, door dwell handling, and a test/evaluation pipeline (`docker-compose`, evaluator writing timestamped JSON).

**Trade-offs**: Simplicity and determinism were prioritized over optimal global scheduling and distributed persistence. This makes the project easier to test, explain, and teach.

**When to revisit**: If real-world performance or distributed operation is required:
- Add persistent store for car state and requests.
- Replace deterministic heuristic with an optimizer (but keep a deterministic test-mode).

---
Files of interest (examples):
- `tests/elevator/controller.go` — controller implementation (thread-safety, assign, RequestAndBoard)
- `tests/after/*_test.go` — unit and integration tests
- `tests/run_tests.sh` — test runner used by `test-after`
- `evaluation/evaluation.go` — produces JSON reports at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`
- `docker-compose.yml` — orchestrates `test-after` (golang:1.18 stage) and `evaluate`

If you want, I can commit this trajectory into the repo and/or expand any phase into a checklist of concrete commits and PRs.
# Trajectory

