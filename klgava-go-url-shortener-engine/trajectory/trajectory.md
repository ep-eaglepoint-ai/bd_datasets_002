# Trajectory

# Trajectory (Thinking Process for Refactoring)

### 1. Audit the Original Code (Identify Scaling & Concurrency Flaws)

I audited the original proof-of-concept (`repository_before`). It utilized a global map without synchronization, made it susceptible to panic-inducing race conditions under load. It used MD5 (cryptographically slow for this purpose) and naive truncation (`[:6]`), creating a high probability of unhandled collisions.
_Learn about Go Race Conditions:_ [Data Race Detector](https://go.dev/doc/articles/race_detector)
_Concept:_ The "Birthday Paradox" regarding hash collisions on truncation.

### 2. Define a Performance & Safety Contract First

I defined the strict boundaries for the refactor: The system must assume 10,000+ concurrent users (Requirement 1). It must never overwrite data (Requirement 2). It must validate inputs before processing (Requirement 4). Time complexity must remain O(1) (Requirement 5).
_Strategy:_ Design-by-Contract ensures we don't optimize prematurely before knowing the safety constraints.

### 3. Rework the Data Model for Thread Safety

I encapsulated the global `map` into a `URLShortener` struct protected by a `sync.RWMutex`. This replaces the unsafe global state with a controlled access pattern.
_Optimization:_ Using `RWMutex` allows multiple concurrent readers (Resolves) while strictly serializing writers (Shortens), vastly improving read throughput over a standard Mutex.

### 4. Refactor Encoding Strategy (Hex vs Base62)

I replaced the Hex encoding (0-9, a-f) with Base62 (0-9, a-z, A-Z). This allows shorter keys (7 chars) to hold significantly more entropy than hex, satisfying Requirement 3.
_Math:_ $62^7 \approx 3.5$ trillion combinations, compared to $16^6 \approx 16$ million for the original hex approach.

### 5. Implement Deterministic Collision Resolution

I implemented a looping "Salt/Re-hash" strategy. If a generated key is taken by _another_ URL, the system increments a salt and re-hashes until a free slot is found.
_Algorithmic Safety:_ This converts a probabilistic failure (overwrite) into a deterministic success (unique key generation), albeit with a slight performance cost only during rare collision events.

### 6. Enforce Input Integrity (Validation Layer)

I added a validation layer using `net/url`. The system now rejects relative paths, empty strings, or non-HTTP/HTTPS schemes before any hash computation occurs.
_Security:_ This prevents the storage from being flooded with junk data or potentially malicious URI vectors.

### 7. Eliminate Race Conditions with Atomic Locking

I implemented a "Read-Check-Write" pattern inside the Critical Section.

1. Acquire Read Lock -> Check existence.
2. If distinct, Acquire Write Lock -> Check existence again (Double-Checked Locking) -> Write.
   This eliminates the window where two goroutines could generate the same key and overwrite each other.

### 8. Verify with Concurrency Stress Testing

I built a specific test harness (`TestConcurrencyStress`) spawning 10,000 goroutines. This serves as the "Proof" for Requirement 6.
_Technique:_ Utilizing `sync.WaitGroup` and error channels to capture failures in high-velocity asynchronous execution.

### 9. Prove Collision Handling via White-Box Testing

I wrote `TestCollisionIntegrity` which acts as a white-box test. It manually manipulates the internal store to force a collision scenario, verifying that the new logic correctly "moves" to the next available key without data loss.

### 10. Result: Reliable, High-Performance Engine

The final solution satisfies all 8 requirements. It converts a fragile script into a robust engine capable of handling high concurrency with mathematically sound collision management and O(1) lookups.

---

# Trajectory Transferability Notes

The above trajectory is designed for **Refactoring**. The steps outlined in it represent reusable thinking nodes (Audit, Contract, Structural Model, Logic Implementation, and Verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as System Design, Security Hardening, or API Development) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories.

### Refactoring → System Design

- **Audit** becomes **Requirements Gathering**: Instead of finding bugs in code, verify gaps in business needs.
- **Contract** becomes **SLA/SLO Definition**: Define latency, availability, and consistency models.
- **Data Model** becomes **Schema/Database Design**: Choosing SQL vs NoSQL, normalization vs denormalization.
- **Collision/Logic** becomes **Distributed Consensus**: Handling eventual consistency or leader election.
- **Verification** becomes **Load Testing/Chaos Engineering**: Validating the system under peak stress.

### Refactoring → Security Hardening

- **Audit** becomes **Vulnerability Scanning**: Identifying SQLi, XSS, or race conditions.
- **Contract** becomes **Threat Modeling**: Defining trust boundaries and attack surfaces.
- **Data Model** becomes **Least Privilege Architecture**: Restricting access to memory/storage.
- **Validation** becomes **Input Sanitization**: Implementing strict allow-lists for data entry.
- **Verification** becomes **Penetration Testing**: Actively trying to break the implemented security controls.

### Refactoring → API Development

- **Audit** becomes **Consumer Analysis**: Understanding who calls the API and why.
- **Contract** becomes **API Specification (OpenAPI)**: Defining strict request/response schemas.
- **Refactor Encoding** becomes **Serialization Strategy**: Choosing JSON vs gRPC/Protobuf.
- **Collision Handling** becomes **Idempotency**: Ensuring retries don't create duplicate resources.
- **Verification** becomes **Contract Testing**: Ensuring the implementation matches the spec.

## Core Principle (Applies to All)

- The trajectory structure stays the same: **Audit → Contract → Design → Execute → Verify**.
- Only the focus and artifacts change.
