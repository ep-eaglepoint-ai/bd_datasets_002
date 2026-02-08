# Trajectory: Bookmark Manager

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What must this bookmark manager do and what are the constraints?"

**Reasoning**:
This project is a lightweight, client-first bookmark manager implemented with TypeScript and Next.js (App Router). The primary goals are: reliable local persistence, low-latency UI, simple import/export, and small analytics utilities — all without introducing heavy server-side requirements.

**Key Requirements**:
- **Persistence**: Save and load bookmark state locally (localStorage). Must be deterministic and recoverable across reloads.
- **Import/Export**: Allow CSV/JSON import and export of bookmarks.
- **Analytics**: Provide local analytics (most visited, domain frequency, tag distribution).
- **Performance**: Handle large collections (thousands of bookmarks) with acceptable client-side performance.
- **Determinism & Tests**: Unit & stress tests that validate logic (search, analytics, persistence).
- **No External Backing**: Work offline without a remote DB by default. `repository_after` is a separate snapshot used for verification only.

**Constraints Analysis**:
- **Forbidden**: No external persistence services. Keep third-party runtime dependencies minimal.
- **Required**: Use TypeScript, include tests under `/tests`, and ensure deterministic behaviors for sorting/searching.

### 2. Phase 2: QUESTION ASSUMPTIONS
**Guiding Question**: "Are we overengineering anything?"

**Reasoning**:
The app must remain simple and local-first. Instead of introducing complex indexing or a DB, rely on efficient in-memory algorithms and well-structured data shapes. For analytics, compute on-demand (debounced or worker offload if needed) rather than maintaining complex derived state.

### 3. Phase 3: DEFINE SUCCESS CRITERIA
**Guiding Question**: "What does 'done' look like?"

Success Criteria (measurable):
1. Local persistence reads/writes round-trip bookmarks without data loss for common fields (id, title, url, tags, isFavorite, timestamps).
2. CSV import/export round-trips bookmark data (preserve id and tags).
3. Analytics functions (`getMostVisitedBookmarks`, `getFrequentlySavedDomains`, `getTagDistribution`) return deterministic, stable results and have unit tests.
4. UI remains responsive with 10k bookmarks (stress tests included).
5. Tests under `/tests` pass in CI and locally (smoke, analytics, persistence, stress).

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Test Strategy)
**Guiding Question**: "How will we prove correctness and completeness?"

Test Strategy:
- **Unit Tests**:
	- `simple-analytics.test.ts`: validate analytics helpers produce expected ordering/counts.
	- `simple-persistence.test.ts`: validate localStorage usage and round-trips.
	- `simple-smoke.test.ts`: basic sanity checks (Date/JSON/localStorage presence).
- **Stress Tests**:
	- `simple-stress.test.ts`: generate large datasets, validate search/analytics performance and behavior.
- **Integration Validation**:
	- Manual/CI run that ensures `repository_after` snapshot meets acceptance (automated tests should not modify `repository_after`).

### 5. Phase 5: SCOPE THE SOLUTION (Minimal Implementation)
**Guiding Question**: "What minimal set of components satisfies success criteria?"

Components:
- `utils/importExport.ts` — CSV/JSON import and export helpers.
- `utils/url.ts` — URL parsing/normalization used by analytics.
- `store/bookmarkStore.ts` — in-memory state + persistence hooks to `localStorage`.
- `components/DownloadCSVButton.tsx` — export UI.
- Tests under `/tests` to cover the above helpers and stores.

### 6. Phase 6: TRACE DATA/CONTROL FLOW
**Guiding Question**: "What paths will the data take?"

Flows:
- **Save flow**: User action → `bookmarkStore` mutation → serialize → `localStorage.setItem`.
- **Load flow**: App boot → `bookmarkStore` load → parse → hydrate in-memory store.
- **Import flow**: User uploads file → `importExport` parses rows → validation/normalization → merge into `bookmarkStore`.
- **Analytics flow**: UI requests analytics → analytics helpers compute from in-memory store → render.

### 7. Phase 7: ANTICIPATE OBJECTIONS
**Guiding Question**: "What could go wrong?"

Common concerns and responses:
- **Concern**: localStorage Date serialization loses Date objects.
	- **Mitigation**: Tests compare serialized strings or rehydrate date fields explicitly.
- **Concern**: Performance with large datasets.
	- **Mitigation**: Optimize search and analytics; add thresholds and relax timing assertions in tests for CI.
- **Concern**: Users accidentally overwrite data on import.
	- **Mitigation**: Import prompts (merge vs replace) + backups (export before import).

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What invariants must hold?"

Invariants:
- `id` is unique per bookmark.
- `createdAt`/`updatedAt` are ISO timestamps when serialized.
- Analytics ordering is deterministic: primary by metric, secondary by title or id.
- No network calls during persistence unit tests.

### 9. Phase 9: EXECUTION PLAN (Ordered Implementation)
**Guiding Question**: "What exact steps minimize risk?"

1. **Write analytics helpers** (`getMostVisitedBookmarks`, `getFrequentlySavedDomains`, `getTagDistribution`) and unit tests. (Low risk)
2. **Implement persistence API** in `bookmarkStore` and tests that assert localStorage usage. (Low risk)
3. **Add import/export helpers** and CSV download button. (Low risk)
4. **Add stress tests** and tune performance thresholds; make deterministic tie-breakers for sorts. (Medium risk)
5. **Document run/evaluation steps** and add evaluator that writes `evaluation/yyyy-mm-dd/hh-mm-ss/report.json`. (Low risk)

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "How do we verify the project meets the success criteria?"

Verification steps:
- Run the automated test suite: all tests pass locally and in CI.
- Manually exercise import/export + open the exported CSV in a spreadsheet to confirm columns.
- Run the stress test generation to confirm analytics/search remain responsive.
- Inspect `evaluation` report JSON for test run metadata and pass/fail summary.

### 11. Phase 11: DOCUMENT THE DECISION
**Problem**: Build a small, offline-capable bookmark manager with reliable local persistence, import/export and analytics.

**Solution**: Keep business logic small and test-covered, prefer deterministic algorithms, and keep storage local-first. Reserve server-side solutions only if the user requests sync/remote features later.

**Trade-offs**: Using local JSON/localStorage keeps setup minimal but is not suitable for multi-device sync or large-scale availability.

**When to Revisit**:
- If sync or multi-device support is required, add a server-backed sync layer and move persistence to an authenticated API.
- If analytics need to run on very large datasets, consider an indexed DB or background worker processing.

**Test Coverage Goal**: Keep core helpers and persistence covered by unit tests; maintain stress tests for performance regression detection.

**Notes about recent work**: During the evaluation work we made tests deterministic (tie-break sorts), relaxed CI timing thresholds where appropriate, and added an evaluator that writes a timestamped `report.json` to `/evaluation` for CI validation.

-- End of Trajectory

