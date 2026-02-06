# Trajectory (Thinking Process for Full-Stack Development)

**1. Audit the System & Product Flow (Identify Architecture)**
I audited the requirements for a high-performance, offline-first task management application. The core constraint was to operate entirely client-side without external APIs, requiring robust local persistence.
_Identified Challenge:_ Traditional React state is transient; `localStorage` is synchronous and limited.
_Solution:_ Adopted **IndexedDB** for asynchronous, large-capacity storage and **Zustand** for predictable state management.

**2. Define Data & Performance Contracts First**
I defined the strict data contracts using **Zod** schemas before writing UI code.

- **Tasks**: Strict typing for status (pending, in-progress), priority, and dates.
- **TimeLogs**: Precision tracking with start/end times and duration.
- **Contract guarantees**: All data entering the DB must pass Zod validation; application must function without network.

**3. Design the Data Model for Efficiency (Frontend State Shape)**
I designed a normalized data model to be stored in IndexedDB.

- **Stores**: Separate object stores for `tasks` and `timeLogs` to avoid deep nesting issues.
- **Indexes**: Created indexes for common query patterns: `by-status`, `by-priority`, `by-taskId` (foreign key equivalent).

**4. Build the Logic Pipeline (State Management)**
I implemented a projection-first pipeline using **Zustand** stores (`useTaskStore`, `useTimeStore`).

- The store acts as the single source of truth, synchronizing in-memory state with the asynchronous IndexedDB efficiently.
- Decoupled the specific storage implementation (`idb`) from the React components via the store hooks.

**5. Move Filters to the Database (Client-Side Indexes)**
Instead of filtering arrays in memory (which causes jank with thousands of items), the architecture leverages IndexedDB indexes (`getAllFromIndex`) for efficient data retrieval based on keys like `taskId` or `status`.

**6. Ensure Deterministic State Transitions**
I established explicit state transitions managed by the store actions.

- Time tracking logic verifies that only one task can be active at a time (`startTimer` auto-stops previous).
- State updates use functional setters to prevent race conditions.

**7. Stable Persistence & polyfills**
I ensured that the environment (including the testing environment) mimics the browser accurately.

- Implemented **crypto.randomUUID** and **structuredClone** polyfills for the Jest environment to match modern browser capabilities.
- Used **fake-indexeddb** to verify persistence logic without a GUI.

**8. Eliminate "N+1" Client-Side Patterns**
Designed the stores to load data efficiently.

- `loadLogs(taskId)` fetches specific logs rather than iterating unrelated collections.
- Batch updates are handled via atomic store actions.

**9. Optimize for Testability**
I treated the testing infrastructure as a first-class citizen.

- **Containerized Testing**: Created a Docker-based test runner that reuses the environment for both verification and metrics.
- **Mocking**: Abstracted `idb` for tests to run fast in Node.js while validating the actual logic flow.

**10. Result: Measurable Reliability + Offline Capabilities**
The solution provides a robust, testable foundation where:

- Data integrity is guaranteed by Zod.
- State is predictable via Zustand.
- The application passes 100% of logic verification tests in a CI-like Docker environment.

---

# Trajectory Transferability Notes

The above trajectory is designed for **Full-Stack Development** (specifically Client-Side Application Engineering). The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as refactoring, performance optimization, testing, and code generation) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories by adapting the inputs, constraints, and validation signals specific to each task type.

### Full-Stack Development → Refactoring

- **Audit**: Replace system flow audit with code/query audit.
- **Contract**: Performance contract focuses on specific metrics (latency, memory).
- **Data Model**: Focus on normalizing/denormalizing for specific bottlenecks.

### Full-Stack Development → Performance Optimization

- **Audit**: Runtime profiling & bottleneck detection.
- **Contract**: SLOs, SLAs, latency budgets.
- **Data Model**: Indexes, caches, async paths.
- **Verification**: Metrics, benchmarks, and load tests.

### Full-Stack Development → Testing

- **Audit**: Test coverage & risk audit.
- **Contract**: Test strategy & guarantees.
- **Data Model**: Fixtures and factories.
- **Verification**: Assertions & invariants.

### Full-Stack Development → Code Generation

- **Audit**: Requirements & input analysis.
- **Contract**: Generation constraints.
- **Data Model**: Domain model scaffolding.
- **Verification**: Style, correctness, and maintainability.

### Core Principle (Applies to All)

- **The trajectory structure stays the same**
- **Only the focus and artifacts change**
- **Audit → Contract → Design → Execute → Verify remains constant**
