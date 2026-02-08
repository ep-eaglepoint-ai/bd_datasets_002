# Trajectory: Destination Dispatch Elevator Controller (Go)

### 1. Phase 1: REQUIREMENTS AND CONSTRAINTS
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The goal is to build a destination‑dispatch elevator controller in Go that assigns a specific car immediately for each request, simulates movement and doors, and remains thread‑safe under concurrency. Assignment must respect direction momentum and capacity constraints, and the system must avoid starvation under high load.

**Key Requirements**:
- **Directional Momentum**: A car moving UP must not service a DOWN request until its UP requests are done (or idle).
- **Capacity Guard**: If `currentLoad >= maxCapacity`, assignment cost must be infinity so the car is not chosen.
- **Thread Safety**: Global controller state must be protected by `sync.RWMutex`.
- **Immediate Assignment**: `RequestRide(from,to)` must return a car ID immediately (O(1) or O(N_cars)).
- **Heuristic Assignment**: Must use a cost heuristic (distance + stop penalties). No random/round‑robin.
- **Movement Simulation**: Cars move one floor per tick with real time passing.
- **Door Dwell**: Doors stay open for a dwell period; no movement during dwell.
- **Immediate Boarding at Open Doors**: If doors are open at the request floor, board without movement.
- **Invalid Floors**: Handle floors outside bounds gracefully.
- **Starvation Robustness**: Edge requests must still get served during heavy traffic.

**Constraints Analysis**:
- **Language**: Go 1.18+ only, standard libs (`sync`, `time`, optional `container/heap`).
- **No External Dependencies**: Must be a self‑contained library.

### 2. Phase 2: QUESTION ASSUMPTIONS
**Guiding Question**: "Is there a simpler way that still satisfies the requirements?"

**Reasoning**:
We need determinism and clear concurrency correctness. A simple cost heuristic with strict momentum rules is sufficient to satisfy the problem statement without adding complex optimizers.

**Scope Refinement**:
- **Initial Assumption**: A sophisticated optimizer might be required.
- **Refinement**: A deterministic heuristic (distance + stop penalty) is acceptable and easier to test.
- **Rationale**: The prompt emphasizes correctness and constraints over optimal global scheduling.

### 3. Phase 3: DEFINE SUCCESS CRITERIA
**Guiding Question**: "What does 'done' mean in measurable terms?"

**Success Criteria**:
1. `RequestRide` returns a car ID immediately for valid floors.
2. Cars never exceed capacity at any time.
3. Directional momentum is never violated.
4. Movement advances one floor per tick and respects door dwell.
5. Invalid floors return an error without panics.
6. Starvation protection exists and queued requests eventually get scheduled.
7. All tests pass with deterministic outcomes.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
- **Assignment Tests**:
  - `TestDeterministicAssignmentChooseLowestIDInitially`
  - `TestDirectionalMomentumBlocking`
  - `TestPenalizeFullCapacityAndTieBreakByID`
  - `TestAssignmentAvoidsFullCars`
  - `tests/assignment_test.go`
- **Capacity/Concurrency**:
  - `TestConcurrentRequestRideDoesNotOverfill`
  - `tests/concurrent_board_test.go`
- **Movement/Dwell**:
  - `TestMovementSim`
  - `TestDoorDwellPreventsMovement`
  - `tests/movement_test.go`, `tests/dwell_test.go`
- **Request Validation + Open‑Door Boarding**:
  - `TestRequestRideInvalidFloors`
  - `TestRequestRideValidFloorsReturnsCar`
  - `TestRequestRideBoardsWhenDoorsOpenAtFloor`
  - `tests/request_test.go`
- **Controller RWMutex**:
  - `TestConcurrentReadersNoRace`
  - `TestControllerEmbedsRWMutex`
  - `tests/controller_test.go`
- **Starvation Queue**:
  - `TestQueuedRequestEventuallyAssigned`
  - `tests/starvation_test.go`

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: "What is the minimal implementation that meets all requirements?"

**Components Implemented**:
- **Controller**: Assignment, validation, global locks.
  - `repository_after/controller.go`
- **Car Model**: Per‑car state and snapshots.
  - `repository_after/car.go`
- **Movement Loop**: Ticker‑based movement + dwell.
  - `repository_after/movement.go`
- **Errors**: Invalid floor / no car errors.
  - `repository_after/errors.go`

### 6. Phase 6: TRACE DATA / CONTROL FLOW
**Guiding Question**: "How does a request move through the system?"

**RequestRide Flow**:
Validate floors → `assignCar` (cost heuristic + momentum + capacity) → schedule pickup/dropoff under car lock → return car ID immediately.

**Movement Flow**:
Per‑car goroutine ticks → handle door dwell → open doors if stop → move one floor per tick.

**Queue/Starvation Flow**:
If all cars are full → queue request with assigned car ID → dispatcher retries scheduling when capacity frees.  
If cars are blocked by momentum (but not full), the request is queued and retried by the dispatcher.

### 7. Phase 7: ANTICIPATE OBJECTIONS
**Guiding Question**: "What could go wrong?"

**Objection 1**: "Why not reassign to other cars dynamically?"
- **Counter**: The prompt requires immutable assignment from the user’s perspective. Deterministic assignment is simpler and testable.

**Objection 2**: "Is the heuristic too simple?"
- **Counter**: The requirement is heuristic-based assignment, not optimal scheduling.

**Objection 3**: "Queueing when full breaks immediate assignment."
- **Counter**: We still return a car ID immediately while deferring scheduling until capacity frees.

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What must always hold true?"

**Must Satisfy**:
- Capacity never exceeds max.
- Momentum rule never violated.
- Doors prevent movement during dwell.
- RWMutex protects controller global state.

**Must Not Violate**:
- No teleporting; movement must be tick‑based.
- No random/round‑robin assignment.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION
**Guiding Question**: "In what order were changes made?"

1. Implement controller + car state with locking. (Low risk)
2. Add deterministic assignment heuristic + momentum/capacity guards. (Medium risk)
3. Add movement loop with tick + dwell. (Medium risk)
4. Add starvation queue + dispatcher for full cars. (Medium risk)
5. Validate behavior with the existing test suite. (Low risk)

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "Did we build what was required?"

**Requirements Completion**:
- **REQ‑1 Momentum**: Enforced in `carCost` (no relax).
- **REQ‑2 Capacity**: Full cars return infinite cost; assignment avoids them.
- **REQ‑3 RWMutex**: Verified via reflection test.
- **REQ‑4 Immediate ID**: `RequestRide` returns a car ID immediately.
- **REQ‑5 Heuristic**: Distance + stop penalty.
- **REQ‑6 Movement**: Tick‑based one‑floor movement.
- **REQ‑7 Dwell**: Doors open block movement.
- **REQ‑8 Open‑Door Boarding**: Explicit test added.
- **REQ‑9 Invalid Floors**: Validated with error returns.

**Quality Metrics**:
- **Tests**: Suite covers assignment, capacity, movement, dwell, invalid floors, concurrency, and starvation.

### 11. Phase 11: DOCUMENT THE DECISION
**Problem**: Build a deterministic, thread‑safe destination‑dispatch controller in Go with realistic movement simulation and capacity/momentum constraints.  
**Solution**: Implemented a lock‑protected controller with a heuristic assignment algorithm, per‑car movement goroutines, door dwell, and a starvation‑safe queue while preserving immediate ID assignment.  
**Trade‑offs**: Determinism and simplicity over globally optimal scheduling.  
**When to revisit**: If optimal throughput is required, consider pluggable schedulers.  
**Test Coverage**: Unit tests cover assignment, movement, dwell, invalid floors, concurrency, capacity, and starvation behavior.
