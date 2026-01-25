# U1BQ7B - Trajectory

1. Audit the Requirements (Scope Definition)
   I audited the detailed requirements for the Zero-Failure Database Advisory Lock Manager. The goal was to transform a flawed, race-condition-prone lock helper into a production-grade, zero-failure implementation suitable for high-concurrency Go systems. Key constraints included eliminating deadlocks, fixing race conditions and state desync, ensuring all database calls respect `context.Context`, managing `*sql.Conn` lifecycle safely, using PostgreSQL advisory locks correctly, and implementing bounded retries with deterministic backoff.

2. Identify Critical Bugs in Existing Code
   I analyzed the `repository_before/dblock.go` and identified 8 critical bugs: (1) `sync.Once` blocks reinitialization after connection failure, (2) `isLocked` set before DB call causes state desync if DB hangs, (3) `context.AfterFunc` called per retry iteration causes goroutine leaks, (4) asymmetric lock/unlock using different hash methods (`pg_advisory_xact_lock` with FNV hash vs `pg_advisory_unlock` with `hashtext()`), (5) transaction-scoped lock auto-releases on commit making explicit unlock fail, (6) `context.Background()` ignores caller's cancellation/timeout, (7) race condition between atomic check and mutex in `ReleaseLock`, (8) connection leak when acquisition fails.

3. Define the Architecture and Design Decisions
   I selected a standard Go approach using `sync.Mutex` for all state protection, eliminating the racy atomic operations. I chose session-scoped `pg_advisory_lock`/`pg_advisory_unlock` for explicit, symmetric lock management. I implemented FNV-1a 64-bit hashing for deterministic lock IDs computed once at construction. I designed a `context.AfterFunc` registration that only triggers once per acquisition to prevent goroutine leaks.

4. Implement Core Lock Helper
   I completely rewrote the `DatabaseLockHelper` struct with proper encapsulation: mutex-protected state (`locked`, `conn`), deterministic `lockID` computed via FNV-1a, and dedicated `*sql.Conn` per lock acquisition. I replaced `sync.Once` with explicit connection management per `AcquireLock` call, ensuring failed acquisitions don't permanently break the helper.

5. Implement Retry Logic with Backoff
   I implemented bounded retry logic with linear backoff (`(attempt+1) * 100ms`). Non-final attempts use `pg_try_advisory_lock` (non-blocking), while the final attempt uses `pg_advisory_lock` (blocking). Context cancellation is checked before each attempt and during backoff sleep. All errors are preserved using `errors.Join` to maintain the complete error chain for debugging.

6. Implement Context-Driven Lifecycle Management
   I implemented automatic cleanup via `context.AfterFunc`, registered exactly once per acquisition. When the caller's context is cancelled or times out, the lock is automatically released without requiring explicit caller intervention. All database operations propagate the caller's context for proper timeout and cancellation support.

7. Implement Background Health Monitoring
   I added configurable health monitoring that spawns a background goroutine after lock acquisition. The health loop runs `SELECT 1` periodically to validate connection liveness, coordinating with the main lock logic through the shared mutex. The health monitor terminates cleanly when the lock is released or context is cancelled.

8. Verify with Comprehensive Testing
   I established a verification suite in the `tests/` directory with 7 distinct test files covering all requirements: `reusable_lock_helper_test.go` (retry/backoff/context), `internal_synchronization_test.go` (mutex protection, no panics under contention), `connection_management_test.go` (explicit lifecycle, isolation, cleanup), `retry_error_chains_test.go` (error preservation, joined errors), `health_monitoring_test.go` (background checks, coordination), `context_lifecycle_test.go` (automatic cleanup, idempotent release), and `deterministic_lock_id_test.go` (FNV-1a stability, collision resistance). All tests compile and pass `go vet` static analysis.
