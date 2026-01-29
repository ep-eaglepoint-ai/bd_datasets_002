# Implementation Trajectory


### 1. Dependency Injection for Testability
**Lesson:** Use interfaces to inject fake implementations for time, randomness, and I/O
- **Resource:** [Go Testing Techniques](https://go.dev/doc/tutorial/add-a-test)
- **Applied:** Created FakeClock, FakeRand, FakeDownloader to eliminate non-determinism

### 2. Race Detection in Concurrent Code
**Lesson:** Use `go test -race` to detect data races in concurrent systems
- **Resource:** [Go Race Detector Blog](https://go.dev/blog/race-detector)
- **Applied:** Verified all tests pass race detection with proper synchronization

### 3. Test Doubles vs Mocks
**Lesson:** Fakes (with state) are better than mocks (with expectations) for complex behavior
- **Resource:** [Test Doubles - Martin Fowler](https://martinfowler.com/bliki/TestDouble.html)
- **Applied:** Built stateful fakes that track calls and simulate realistic behavior

### 4. Meta-Testing with AST Parsing
**Lesson:** Use `go/ast` to validate test suite quality programmatically
- **Resource:** [Go AST Package](https://pkg.go.dev/go/ast)
- **Applied:** Created meta tests to ensure no real time dependencies exist

### 5. Manual Time Control for Determinism
**Lesson:** Control time advancement manually instead of using real delays
- **Resource:** [Testing Time-Dependent Code](https://www.youtube.com/watch?v=QAh0H90-XE4)
- **Applied:** FakeClock.Advance() to instantly simulate time passing

### 6. Atomic Operations for Concurrency Safety
**Lesson:** Use sync/atomic for lock-free counters in concurrent tests
- **Resource:** [Go sync/atomic Package](https://pkg.go.dev/sync/atomic)
- **Applied:** Tracked max in-flight requests with atomic operations

### 7. Context Cancellation Testing
**Lesson:** Test graceful shutdown by canceling context mid-execution
- **Resource:** [Go Concurrency Patterns: Context](https://go.dev/blog/context)
- **Applied:** Verified workers stop cleanly when context is canceled
