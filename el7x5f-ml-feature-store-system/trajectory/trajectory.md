# Trajectory: ML-Feature-Store-System

## 1. How I Interpreted the Problem

I first understood what the requirements are, then I grouped them mentally into two layers:

1. **The “full platform” vision** (Spark, Kafka/Faust, Great Expectations, RedisTimeSeries, Postgres, UI, SDKs).
2. **The non-negotiable correctness core** that every feature store must get right even in a minimal deployment:
   - A clear feature definition contract
   - Traceable lineage/dependencies
   - Deterministic online retrieval semantics (defaults, staleness)
   - A point-in-time join that prevents leakage

My mental model was: _if the correctness core is solid and the interfaces are clean, the heavy integrations can be layered on later without rewriting everything._

---

## 2. Audit of the Starting State

The repository started essentially empty: no concrete library code, no meaningful dependencies, and a placeholder evaluation script. That forced me to design from first principles.

At this stage I asked myself a few “risk” questions:

- **What will be hardest to fix later if I get it wrong now?**
  Training–serving consistency and lineage. Those require early architectural decisions.
- **What will be easiest to stub without blocking progress?**
  Spark/Faust/GE integrations—because those can be optional modules with stable interfaces.
- **What needs to be testable inside Docker without extra operational complexity?**
  The core system behavior. That’s why I planned tests around mocks and lightweight local stores.

---

## 3. Defining the Contract (What “Correct” Means)

I wrote down a few invariants I wanted the implementation to guarantee:

- **A Feature is a definition, not just a column**: it must declare entity keys, event time, source binding, transformation type, metadata, and dependencies.
- **Lineage must be explicit and queryable**: if `derived_feature` depends on `base_feature`, I should be able to reconstruct that graph.
- **Online retrieval must be deterministic**:
  - If a value is missing, return a default (not an exception).
  - If values are stale (older than a max age), return defaults.
- **Point-in-time joins must prevent leakage by construction**: for every label event time $t$, join only feature values with event time $\le t$.

These invariants guided both the code shape and the tests.

---

## 4. Structural Design Decisions

### 4.1 A declarative DSL that stays boring on purpose

I chose a simple Python DSL (dataclasses + a `feature()` helper) because it’s:

- Easy to read/review
- Easy to serialize into a registry
- Easy to validate and reason about

I avoided clever metaprogramming because feature definitions become an organizational API. I want them to be explicit and stable.

Key decision: I modeled transformations as _types_ (`SQLTransform`, `PythonTransform`) rather than just raw strings/callables. That makes downstream code and validation easier because the transform “kind” is always known.

### 4.2 Registry: SQLAlchemy + lineage edges

I used a SQLAlchemy-backed registry storing:

- Feature definitions (including metadata/source/depends_on)
- Lineage edges as a separate table

In my head, I kept a strict separation:

- The registry stores _what_ the feature is.
- Pipelines (Spark/Faust) decide _how_ it’s computed.

This prevents the registry from becoming an execution engine.

### 4.3 Online store: deterministic semantics first

Even though the requirement mentions RedisTimeSeries, I prioritized semantics over a specific Redis module.

I implemented:

- Per-entity feature values in Redis hashes
- A per-entity event timestamp for freshness checks

The critical part wasn’t the data structure—it was enforcing predictable outcomes for missing/stale values.

### 4.4 Point-in-time join: start with a reference implementation

Point-in-time joins are subtle and easy to get wrong. My strategy was:

1. implement a correct reference using pandas `merge_asof` (backward direction),
2. test leakage prevention explicitly,
3. keep the door open for a Spark window-function implementation later.

This gave me high confidence in semantics, and a known target for a future Spark version.

---

## 5. Execution & Packaging

I packaged everything as a library (`feature_store` package under `repository_after`) and exposed a small FastAPI app for:

- Health
- Feature discovery
- Online retrieval
- Minimal HTML UI for browsing

My intention was not to build a “pretty” UI, but to provide a real endpoint surface that mirrors what feature platforms typically expose.

---

## 6. Testing Strategy (and why I pivoted to mocks)

Initially, it was tempting to run integration tests against real Postgres + Redis containers. But you explicitly asked to use mocks.

I agreed with the underlying motivation: tests should be reliable and not require extra services to run, especially in constrained evaluation environments.

So I used:

- **SQLite** for registry tests (still exercising SQLAlchemy models and lineage logic)
- **fakeredis** to simulate Redis behavior and cover edge cases

The way I thought about it:

- _Mocks should validate semantics._
- _Integration tests validate wiring._

Given the constraints, I focused on semantics.

The edge cases I explicitly covered:

- Registry creates correct lineage edges and updates them on upsert
- Online store returns defaults on missing values
- Online store returns defaults on staleness
- PIT join selects the latest past value and does not use future values

---

## 7. Evaluation + Reproducibility

Finally, I wrote an evaluation script that:

- Runs pytest against `repository_before` and `repository_after` by swapping `PYTHONPATH`
- Parses `pytest -v` output into a machine-readable report
- Writes `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`

This is important because it documents not only that tests passed, but _which_ requirements they validate.

---

## 8. What I’d Extend Next (if asked)

If the goal becomes “full platform coverage” rather than “correctness core,” my next steps would be:

- Add Spark PIT join implementation with window functions and watermarking
- Implement Kafka/Faust windowed aggregations and watermark eviction
- Replace the Redis hash implementation with RedisTimeSeries-backed writes
- Flesh out Great Expectations profiling + drift detection with alert hooks

But I intentionally didn’t overbuild those parts here: I kept the interfaces and scaffolding so those integrations can be added without changing the core semantics or breaking tests.
