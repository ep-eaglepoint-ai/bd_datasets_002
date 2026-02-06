## Trajectory (Advanced Context Key Resolution: Deterministic, Adversarial Testing in Go)


### Audit the Original Code (Identify Testing Gaps)

I audited the keys package implementation. It lacked any test coverage, making it impossible to verify correctness of normalization rules, parsing validation, version comparison determinism, LRU cache behavior, and concurrent resolver operations. The package had complex interactions between normalization, wildcard matching, version hashing, caching, and concurrency that required comprehensive adversarial testing.

### 1. Define Test Requirements and Structure First

I defined strict testing requirements following Go's official testing standards: the suite must use only the standard `testing` package (no third-party frameworks), be deterministic and race-safe (passing `go test -race`), use controllable fakes for Clock and Metrics with call-order assertions, employ table-driven tests with subtests as recommended by the [Go Wiki](https://go.dev/wiki/TableDrivenTests), and validate all 10 core requirements through both positive and negative test cases.

### 2. Build Controllable Test Infrastructure

I introduced strongly typed test helpers following Go's interface-based mocking patterns: `mockClock` with a fixed `time.Time` for deterministic timestamps, and `mockMetrics` with thread-safe maps tracking `Inc()` call counts and `Observe()` value sequences. This replaces reliance on real time and no-op metrics, allowing tests to assert both metric values and the exact sequence of calls (e.g., cache miss must call `Observe("latency_ms")` before cache hit does not). The approach aligns with Go's philosophy of using interfaces for testability without external mocking frameworks.

### 3. Create Table-Driven Tests for Core Functions

I built table-driven test structures following the [Go Wiki's table-driven testing pattern](https://go.dev/wiki/TableDrivenTests) for `ParseContextKey`, `NormalizeContext`, `CompareVersions`, and `MatchScore`. Each test uses `[]struct{...}` with descriptive names, expected outcomes, and error conditions. This pattern, recommended by the Go team, ensures systematic coverage of valid inputs, edge cases (empty strings, wildcards, invalid characters), and failure modes while keeping test code DRY and maintainable. The table-driven approach allows writing test logic once and amortizing it across many test cases.

### 4. Test Normalization Rules Exhaustively

I implemented normalization stress tests covering case-folding (uppercase to lowercase), alias resolution chains, `FillUnknown` behavior (empty segments become "unknown"), rejection of wildcard segments in Context (only allowed in Pattern parsing), and strict regex validation that rejects invalid characters, leading/trailing dots, and consecutive dots. Each invalid segment causes the entire normalization to fail with `ErrInvalidSegment`, verified through explicit error type assertions.

### 5. Validate Parsing Rules with Adversarial Inputs

I created parsing tests that verify exact segment count (must be 6), wildcard legality differences (`allowWildcards=true` vs `false`), and rejection of invalid characters including Unicode/non-ASCII. Tests ensure no silent acceptance of "*" in non-wildcard mode and handle edge cases like multiple consecutive hyphens creating empty segments.

### 6. Prove Version Comparison Determinism

I implemented version comparison tests that verify numeric ordering (1.0 < 2.0), mixed numeric/non-numeric parts triggering SHA1 hashing, and determinism checks that compare results across repeated calls with the same non-numeric tokens. Tests assert stable ordering properties rather than specific hash values, ensuring `CompareVersions("1.0.alpha", "1.0.beta")` returns the same result on every call. This follows Go's testing best practice of comparing semantically relevant information rather than implementation details, as outlined in the [Go Test Comments guidelines](https://go.googlesource.com/wiki/+/ca68abda375ad33f778b943bf383b7a58704e007/TestComments.md).

### 7. Verify MatchScore Precision and Tie-Breaking

I built MatchScore tests with carefully constructed patterns that differ by exactly one segment to prove scoring math (exact=10, wildcard=1, version-prefix=6). Tests verify version prefix patterns match `x.y` and `x.y.z` correctly while rejecting incorrect prefixes (e.g., "1.2.*" must not match "1.20.1"). Multi-match scenarios assert the winning pattern is the lexicographically smallest when scores tie.

### 8. Torture Test LRUCache with Edge Cases

I implemented LRU cache tests covering capacity=0 (must not store), capacity=1 (eviction on second insert), repeated Put overwrites (updates existing without eviction), and Get promotion sequences that change eviction outcomes. Tests use a seeded random generator to create repeatable operation sequences and maintain a reference model to assert final cache contents and eviction behavior after hundreds of operations.

### 9. Test Resolver End-to-End with Determinism

I created resolver tests that verify add/remove semantics, deterministic best-match selection (lexicographic tie-breaking), cache hit/miss behavior (first lookup not cached, second lookup cached), correct timestamps from the fake clock, error propagation, and stable results under concurrent access. Tests add patterns in random but seeded order to ensure deterministic matching regardless of insertion sequence.

### 10. Validate Concurrency and Race Safety

I implemented concurrent stress tests using goroutines with WaitGroups and channels (no time.Sleep) to create repeatable interleavings. Tests run parallel Lookup operations while other goroutines call Add and Remove on overlapping patterns, asserting that lookups either succeed with consistent values or return defined errors without panics. The entire suite passes under `go test -race`, proving race-safety. Go's [race detector](https://go.dev/doc/articles/race_detector) is a powerful tool that uses compile-time instrumentation to detect data races at runtime, and our test suite validates that all concurrent operations are properly synchronized.

### 11. Assert Observability and Call Ordering

I added metrics assertions that verify every major code path increments expected counters (`add`, `remove`, `lookup`) and that `Observe("latency_ms")` is called only on cache misses with non-negative values matching the fake clock's scripted deltas. Tests assert call sequencing: first lookup must call `Observe`, second lookup (cache hit) must not call `Observe`, and `FromCache` flag must be set correctly.

### 12. Result: Comprehensive Adversarial Test Coverage

The final test suite validates all 10 requirements through 30+ test functions organized into clear categories (parsing, normalization, version comparison, MatchScore, LRU cache, resolver end-to-end, concurrency, adversarial inputs). The suite uses table-driven tests with subtests (following [Go Wiki recommendations](https://go.dev/wiki/TableDrivenTests)), controllable fakes with call-order assertions, deterministic seeded randomness, and mutation testing via meta-tests to prove the implementation handles all edge cases correctly under concurrent access.
