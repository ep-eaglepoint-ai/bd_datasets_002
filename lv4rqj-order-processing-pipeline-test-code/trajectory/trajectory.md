1. Audit the order-processing contract (identify determinism + correctness risks):
   I audited `order_processor.ts` to map the processing stages and the “knobs” that can create flaky/incorrect behavior if not tested carefully:
   - Inputs: `items: Item[]`, `options: ProcessorOptions`, optional `AbortSignal`
   - Determinism knobs: `stable` ordering vs RNG tie-breaking, injected `RandomSource`, deterministic jitter
   - Behavior knobs: dedupe, normalizeName, include/exclude substrings, min/max priority filters
   - Enrichment: injected `Enricher`, timeout, concurrency throttling
   - Pagination: base64 cursor encoding/decoding and `maxItems`
   - Metrics emission via `onMetrics`

2. Define a test contract first (what must always be true)
   I defined invariants to enforce with tests: never mutate inputs, make randomness reproducible via injection, keep filtering boundaries precise, ensure enrichment is cancellable/timeout-bounded, and keep pagination/metrics consistent. I also aligned with the harness expectation that a baseline run may legitimately report “No tests found”, while the final state must include a complete `*.test.ts` suite.

3. Choose a Jest/TypeScript test style compatible with meta-tests
   I used the Jest “Getting Started” docs as the reference for the test structure and matchers, and followed the TypeScript-friendly approach of importing globals from `@jest/globals` (avoids relying on ambient globals and plays well with lint/meta checks).
   Reference: [Jest Getting Started](https://jestjs.io/docs/getting-started)

4. Build deterministic test doubles for randomness, sleep, and enrichment
   To keep tests reproducible and fast, I introduced:
   - A `FakeRandomSource` that returns a fixed sequence for stable/reproducible “unstable” ordering and jitter
   - Fake `sleep` functions to assert delay behavior without real waiting
   - `Enricher` fakes (successful patching, rejecting, never-resolving for timeout)

5. Validate immutability guarantees
   I wrote a test asserting the input array and item objects are not mutated (even when `normalizeName` and `enrich` are enabled), while the returned output reflects normalization/enrichment.

6. Cover validation failures as explicit `ValidationError`s
   I added tests for invalid inputs:
   - `items` not an array
   - missing `options`
   - empty/invalid `id`, non-string `name`, non-finite `priority`
   - negative priority rejected by default and allowed only when `allowNegativePriority: true`

7. Cover filtering boundaries and substring include/exclude semantics
   I implemented boundary-focused tests for `minPriority` and `maxPriority` (below/exact/above). I also added include/exclude substring tests, including cases where `normalizeName` changes matching behavior and whitespace-only inputs behave predictably.

8. Verify deterministic behavior for “unstable” ordering
   For `stable: false`, ordering uses the injected RNG. I asserted that two processors with the same injected `FakeRandomSource` produce the same order (reproducible randomness).

9. Verify stable tie-breaking rules when `stable: true`
   I added a test that exercises the full stable tie-break chain for equal priorities: id, then name, then original index.

10. Verify artificial delay + jitter behavior without flakiness
   I asserted that `sleep` is called exactly once with `artificialDelayMs + jitter` (where jitter is computed deterministically from the injected RNG), and that `sleep` is not called when delay is disabled.

11. Validate enrichment correctness, timeouts, and concurrency throttling
   I wrote tests that ensure:
   - Successful enrichment patches items and increments `metrics.enrichedCount`
   - Per-item timeout throws `EnrichTimeoutError` (using fake timers safely)
   - Enricher rejection propagates (failure surfaces to caller)
   - `enrichConcurrency` throttles in-flight work (tracked via counters + controlled resolvers)

12. Validate pagination/cursor and metrics accounting
   I added tests for:
   - Multi-page pagination where the union of pages equals the full sorted result
   - Cursor encoding/decoding (base64 index)
   - Metrics fields (`inputCount`, `afterFilterCount`, `afterDedupeCount`, `enrichedCount`, `outputCount`) under filtering + dedupe scenarios

13. Validate cancellation behavior
   I included an abort test ensuring an already-aborted signal causes rejection and prevents enrichment and sleep from running, and that metrics are not emitted in that aborted path.

