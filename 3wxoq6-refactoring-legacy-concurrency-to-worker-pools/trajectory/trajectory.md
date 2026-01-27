# Trajectory: Refactoring Legacy Concurrency to a Worker Pool (Go)

This document captures **how I refactored a broken concurrent Go system** into something that can survive production load. The original code failed in predictable ways: unsafe map access, runaway goroutine creation, and no shutdown control.

The objective wasn’t to “make it compile” — it was to **control concurrency, preserve correctness, and shut down cleanly**.

I followed the same reasoning loop throughout:

**Audit → Contract → Design → Execute → Verify**

Anything that didn’t contribute to safety or predictability was removed.

---

## 1. Auditing the Legacy Code (What Was Actually Broken)

Before refactoring, I read the code specifically looking for *failure modes*, not style issues.

### Failures I Identified
- Concurrent writes to a shared map → runtime panic
- One goroutine spawned per request → unbounded concurrency
- No backpressure → memory spikes under load
- No lifecycle control → impossible to shut down cleanly
- Global state (`metricsCache`) → impossible to reason about or test

### Mistakes I Explicitly Avoided
- Slapping a `sync.Mutex` on the map and calling it done
- Keeping unbounded goroutines and pretending a lock fixes it
- Closing channels incorrectly and introducing deadlocks

At this point, the direction was obvious: **throttle concurrency and isolate shared state**.

---

## 2. Locking the Contract (What the System Must Guarantee)

Before restructuring anything, I wrote down what the refactored system *must* do.

### Hard Requirements I Enforced
- No global variables — especially shared state
- Concurrency must be bounded
- Shared data access must be safe and intentional
- Shutdown must be graceful, not abrupt
- Storage must be decoupled from processing logic

If a solution violated even one of these, it wasn’t acceptable.

---

## 3. Isolating State Behind an Interface

The first structural change I made was removing direct map access entirely.

### MetricStore Interface
I defined a minimal interface with only what the system actually needs:

- `Inc(key string)`
- `Get(key string) int`

No extra methods. No leakage of implementation details.

### Why This Mattered
- Processing logic no longer cares *how* metrics are stored
- Storage can be swapped or tested independently
- Global state disappears completely

This immediately made the system easier to reason about.

---

## 4. Implementing Safe Concurrent Storage

With the interface defined, I implemented a concrete store.

### Storage Decisions
- Backed by a Go map
- Protected by `sync.RWMutex`
  - Read lock for `Get`
  - Write lock for `Inc`

### Reasoning
- Reads are far more frequent than writes
- `RWMutex` allows concurrent reads without blocking
- Exclusive writes still maintain correctness

This fixed the panic issue without introducing unnecessary contention.

---

## 5. Replacing Unbounded Goroutines with a Worker Pool

The most dangerous flaw in the original system was spawning a goroutine per request.

### What I Changed
- Introduced a fixed-size worker pool
- All incoming logs are sent to workers via a **buffered channel**
- Workers pull jobs instead of being spawned dynamically

### Why the Buffered Channel Matters
- Absorbs traffic bursts
- Applies backpressure naturally
- Prevents producers from immediately blocking

Concurrency is now **explicit, bounded, and predictable**.

---

## 6. Designing the AsyncCollector

I encapsulated all concurrency logic inside a single struct.

### AsyncCollector Responsibilities
- Own the worker pool
- Accept jobs through a channel
- Coordinate shutdown
- Use the injected `MetricStore` for storage

### Dependency Injection
The collector receives the `MetricStore` via its constructor.

This ensured:
- No hidden dependencies
- No internal initialization of shared state
- Clear ownership boundaries

---

## 7. Context Propagation & Graceful Shutdown

I treated shutdown behavior as a first-class concern, not an afterthought.

### Context Usage
- The main processing entry point accepts `context.Context`
- Workers listen for:
  - Incoming jobs
  - `ctx.Done()` cancellation signals

### Worker Loop Design
Each worker uses a `select` statement to:
- Process jobs when available
- Exit promptly when cancellation is signaled

### Shutdown Guarantee
- No new jobs accepted after cancellation
- Workers finish their current task
- No dropped or half-processed data

This made shutdown **deterministic instead of chaotic**.

---

## 8. File-Level Separation

To prevent the system from collapsing into a single file blob, I enforced clear boundaries.

### File Layout
- `store.go`
  - `MetricStore` interface
  - Concrete storage implementation
- `collector.go`
  - Worker pool logic
  - Channel coordination
  - Context handling

This separation mirrors responsibility, not convenience.

---

## 9. Final Verification (How I Knew It Was Correct)

Before calling the refactor done, I checked the following:

- No global variables remain
- No concurrent map writes possible
- Goroutine count is bounded
- Buffered channel absorbs traffic spikes
- Context cancellation shuts down workers cleanly
- Storage is fully decoupled from processing

Only after all of these held under load did I consider the system production-ready.

---

## Outcome

The refactored system:
- Eliminates panic conditions
- Prevents memory blowups
- Scales predictably
- Shuts down cleanly
- Is testable and maintainable
