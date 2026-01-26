# Trajectory: Distributed Weighted Resource Governor (DWRG)

## 1. Requirements & Input Analysis
*   **Analysis**: The core requirement was to move beyond simple request counting to a "weighted" cost model where different operations consume variable amounts of quota. The system needed to be distributed, ensuring consistency across a cluster without a central bottleneck.
*   **Key Insight**: A standard Token Bucket is insufficient if it cannot handle atomic distributed updates. The "Thundering Herd" problem required a robust checking mechanism that returns precise cooldowns.
*   **Resources**: 
    *   [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
    *   [Thundering Herd Problem](https://en.wikipedia.org/wiki/Thundering_herd_problem)

## 2. Generation Constraints
*   **Constraints**: 
    *   **Performance**: 100,000 unit-checks per second per instance.
    *   **Concurrency**: Zero-lock or optimized locking architecture (handled via CAS loop).
    *   **Precision**: Sub-millisecond overhead and exact accounting (never exceed limit by 1 unit).
*   **Decision**: Go was chosen for its strong concurrency primitives (goroutines, channels, atomic/sync packages) which align perfectly with the high-throughput requirement.

## 3. Domain Model Scaffolding
*   **Structure**: 
    *   **`ResourceGovernor`**: The facade coordinating the logic.
    *   **`CostResolutionEngine`**: A dedicated component for mapping paths to weights using a specific-match priority (Prefix matching implementation).
    *   **`StateManager`**: The core algorithm implementation. We selected **GCRA (Generic Cell Rate Algorithm)** over a standard "Token Bucket" because GCRA can represent the state (Theoretical Arrival Time) in a *single integer* (nanoseconds), making atomic **Compare-And-Swap (CAS)** operations feasible and efficient without complex locking.
    *   **`AtomicStorage` Interface**: Abstracted persistence to allow for distributed backends (Redis/Etcd) while testing with in-memory mocks.
*   **Resources**:
    *   [GCRA vs Token Bucket](https://github.com/brandur/redis-cell#generic-cell-rate-algorithm-gcra)
    *   [Go CAS Operations](https://pkg.go.dev/sync/atomic)

## 4. Minimal, Composable Output
*   **Approach**: The implementation focused strictly on the "Kernel" of the governor (`Allow` function). We avoided building a full HTTP server or API Gateway framework, instead providing the library that *would be used* by such a gateway. This ensures the component is composable and reusable.
*   **API Design**: 
    *   `Allow(ctx, tenant, method, path) -> (bool, remaining, wait)`
    *   This signature provides all necessary info for 429 Retry-After headers and internal metrics.

## 5. Style, Correctness, and Maintainability
*   **Refinement**: 
    *   Use of `context.Context` for cancellation propagation.
    *   Strict typing for Costs (`int64`) to prevent overflow or floating key errors.
    *   Separation of "Cost Calculation" from "Rate Limiting" allows independent scaling or modification of billing rules without touching the enforcement logic.

## 6. Input/Output Specs & Post-Generation Validation
*   **Validation Strategy**:
    *   **Unit Tests**: Verified basic logic (Burst refill, cost deduction).
    *   **Stress Testing**: A specific "Heavy Load" test with 100 concurrent goroutines confirmed that the atomic CAS loop prevents race conditions (over-consumption), strictly enforcing the global limit.
    *   **Integration**: Functional parity check where `repo_before` (empty) fails and `repo_after` (complete) passes, orchestrated by a highly specific `evaluation.go` script.
