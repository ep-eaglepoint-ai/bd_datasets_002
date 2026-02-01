1. Audit the order-processing contract (identify determinism + correctness risks)

I audited `order_processor.ts` to map the full processing contract and the “knobs” that can create flaky or incorrect behavior if they aren’t tested carefully. The point of the audit was to make sure tests lock down every surface area that can affect ordering, filtering, enrichment behavior, paging, and observability signals.

Key behavior surfaces:
- Inputs: `items: Item[]`, `options: ProcessorOptions`, optional `AbortSignal`
- Determinism knobs: `stable` ordering vs RNG tie-breaking, injected `RandomSource`, deterministic jitter
- Behavior knobs: dedupe, `normalizeName`, include/exclude substrings, min/max priority filters
- Enrichment: injected `Enricher`, timeout, concurrency throttling
- Pagination: base64 cursor encoding/decoding and `maxItems`
- Metrics emission via `onMetrics`

2. Define a test contract first (what must always be true)

I defined invariants up front so the suite checks correctness (not just example outputs):
- Never mutate inputs (array or item objects)
- Make randomness reproducible via injection
- Keep filtering boundaries precise (below/exact/above for min/max)
- Ensure enrichment is cancellable and timeout-bounded
- Keep pagination and metrics consistent across pages and options

3. Choose a Jest/TypeScript test style compatible with meta-tests

I used the Jest docs as the reference for matchers and structure, and used the TypeScript-friendly approach of importing globals from `@jest/globals` (avoids relying on ambient globals and plays well with lint/meta checks).
[Jest Getting Started](https://jestjs.io/docs/getting-started)

4. Build deterministic test doubles for randomness, sleep, and enrichment

To keep tests reproducible and fast, I introduced deterministic fakes rather than relying on wall-clock time or global randomness:
- A `FakeRandomSource` that returns a fixed sequence for stable/reproducible “unstable” ordering and jitter
- Fake `sleep` functions to assert delay behavior without real waiting
- `Enricher` fakes for success, rejection, and never-resolving (to drive timeouts)

5. Validate immutability guarantees

I wrote a test asserting the input array and item objects are not mutated (even when `normalizeName` and `enrich` are enabled), while the returned output reflects normalization/enrichment.

6. Cover validation failures as explicit `ValidationError`s

I added tests for invalid inputs so failures are explicit and predictable:
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
