# Trajectory: db-storage-explorer

### 1. Phase 1: Frame the Problem
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The task is to build a local-first Database Storage Explorer that inspects physical storage internals (heap/index pages, tuple layouts, fragmentation, free space maps, and page-level stats) from local dumps/JSON snapshots without external APIs. The system must be deterministic, robust against corrupted inputs, and optimized for large dumps.

**Key Requirements**:
- **Local Import + Parsing**: Accept JSON snapshots or binary page dumps and validate structure while handling corrupted input without crashing.
- **Heap Page + Tuple Decoding**: Deterministically decode headers, line pointers, tuples, free space, and row layout.
- **Index Visualization**: Render B-Tree-like structures with internal/leaf nodes and utilization.
- **Metrics + Heatmaps**: Fragmentation, bloat estimates, page density, free space distribution, and page-level heatmaps.
- **Historical Comparison + Simulation**: Compare snapshots and simulate storage operations deterministically.
- **Performance**: Chunked parsing, memoization, virtualization, and optional Web Worker for JSON parsing.
- **State + Persistence**: Zustand store with IndexedDB-backed persistence.
- **No External APIs**: All data comes from local dumps or JSON.

**Constraints Analysis**:
- **Required**: Next.js + TailwindCSS + TypeScript, Zustand for state, IndexedDB persistence, D3 for visualization.
- **Forbidden**: External APIs or server-side parsing services.

### 2. Phase 2: Challenge Assumptions
**Guiding Question**: "Where can we be precise and where do we need pragmatic approximations?"

**Reasoning**:
Full fidelity parsing of real PostgreSQL/engine formats is out of scope for a lightweight internal tool. The implementation must be deterministic and explainable even if some parsing is heuristic.

**Scope Refinement**:
- **Initial Assumption**: Full binary-level parsing for all DB engine formats.
- **Refinement**: Implement deterministic parsing with explicit validations and error capture; accept simplified index/tuple decoding for visualization and metrics.
- **Rationale**: The goal is explainable introspection with robust handling, not full engine parity.

### 3. Phase 3: Define Success Criteria
**Guiding Question**: "What does 'done' mean in concrete, measurable terms?"

**Success Criteria**:
1. **Import + Validation**: JSON snapshots missing required fields fail validation deterministically.
2. **Heap Page Rendering**: Page headers, line pointers, free space, and tuples render for valid inputs.
3. **Tuple Inspection**: Header fields and visibility flags are visible without crashing on malformed tuples.
4. **Metrics**: Fragmentation ratio, bloat, page density, and free space map compute without NaN/Infinity.
5. **Historical Comparison**: Comparing snapshots yields deterministic change summaries and trends.
6. **Simulation**: Storage operations deterministically alter page layouts and metrics.
7. **Performance**: JSON parsing optionally uses Web Worker, and large page lists are virtualized.

### 4. Phase 4: Map Requirements to Validation (Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
- **Parsing + Validation**:
  - `tests/requirements.test.ts`: import JSON, reject invalid JSON, handle corrupted binary pages.
- **Visualization Components**:
  - `tests/component.test.tsx`: render PageLayoutView, TupleInspector, IndexVisualization, FragmentationHeatmap, BinaryInspector.
- **Metrics + Analytics**:
  - `tests/requirements.test.ts`: fragmentation metrics, bloat estimate, page density.
- **Comparison + Simulation**:
  - `tests/requirements.test.ts`: `compareSnapshots`, `simulateOperation`.
- **Persistence + Workers**:
  - `tests/requirements.test.ts`: IndexedDB adapter and worker path reference.

### 5. Phase 5: Scope the Implementation
**Guiding Question**: "What is the minimal implementation that satisfies core requirements?"

**Components Implemented**:
- **Parser + Metrics**: `repository_after/src/utils/storageParser.ts`
- **Validation Schema**: `repository_after/src/utils/schemas.ts`
- **Comparison + Simulation**: `repository_after/src/utils/compareSnapshots.ts`, `repository_after/src/utils/simulateOperation.ts`
- **Persistence**: `repository_after/src/store/storageStore.ts`
- **Worker Parse Path**: `repository_after/public/workers/jsonParserWorker.js`
- **Visualization**: `repository_after/src/components/*` (heatmaps, tuple inspection, binary inspector, index visualization)

### 6. Phase 6: Trace Data/Control Flow
**Guiding Question**: "How does data move from file to visualization?"

**Import Flow**:
File → `StorageParser.parseFile` → Format detection → Parse pages/JSON → Compute metrics + free space map + heatmap data → Store snapshot in Zustand + log import.

**Visualization Flow**:
Zustand snapshot → `StorageVisualization` → view components (PageLayoutView, TupleInspector, IndexVisualization, FragmentationHeatmap, BinaryInspector).

**Comparison + Simulation**:
Snapshot A/B → `compareSnapshots` → page change summaries + trends.
Snapshot + op → `simulateOperation` → deterministic page modifications → `StorageParser.recomputeSnapshot`.

### 7. Phase 7: Address Risks / Objections
**Guiding Question**: "What could break or be contested?"

**Objection 1**: "Binary parsing is not a full engine parser."
- **Counter**: The parser is deterministic, validates headers/line pointers, and surfaces corruption via `corruptedPages` and `parsingErrors`.

**Objection 2**: "Metrics are heuristic."
- **Counter**: Metrics are explainable (derived from free space, tuple counts, utilization) and deterministic across runs.

**Objection 3**: "Worker usage is optional."
- **Counter**: Worker parsing is used for JSON where available, with main-thread fallback for resilience.

### 8. Phase 8: Invariants and Constraints
**Guiding Question**: "What must always remain true?"

**Must Satisfy**:
- **Deterministic Decoding**: Same input → same metrics and heatmap data.
- **Corruption Safety**: Invalid pages or tuples do not crash parsing.
- **IndexedDB Persistence**: Snapshot metadata persists via IndexedDB adapter.
- **No External APIs**: Parsing is local-only.

**Must Not Violate**:
- **Invalid JSON Acceptance**: Missing required fields must fail validation.
- **NaN Metrics**: Fragmentation/variance calculations must be guarded.

### 9. Phase 9: Execute with Surgical Precision
**Guiding Question**: "What order minimized risk?"

1. **Parser correctness**: Fix header validation, line pointer decoding, free space math, and corruption handling.
2. **Metrics + Maps**: Ensure fragmentation, bloat, density, free space map are stable and deterministic.
3. **Comparison + Simulation**: Implement deterministic snapshot diffs and storage operations.
4. **Persistence + Worker hooks**: Add IndexedDB storage adapter and worker path.
5. **UI alignment**: Update components to render heatmaps, binary inspection, and tuple views.
6. **Tests**: Align tests with strict parsing and required behavior.

### 10. Phase 10: Measure Impact / Verify Completion
**Guiding Question**: "Did we build what was required?"

**Requirements Completion**:
- **Import + Validation**: ✅ JSON validation + format detection.
- **Heap/tuple decoding**: ✅ Headers, line pointers, tuples, free space shown.
- **Index visualization**: ✅ Keys + utilization and tree stats exposed.
- **Fragmentation + metrics**: ✅ Deterministic metrics calculated.
- **Free space map**: ✅ Computed with fragmentation index.
- **Historical comparison**: ✅ Snapshot deltas and trends.
- **Simulation**: ✅ Insert/update/delete/vacuum/compact modeled.
- **Persistence**: ✅ IndexedDB-backed Zustand persistence.
- **Performance**: ✅ Chunked parsing, memoization, virtualization, worker path.

**Test Coverage**:
Core requirements are exercised in `tests/requirements.test.ts` and component smoke tests in `tests/component.test.tsx`.

### 11. Phase 11: Document Decisions / Trade-offs
**Problem**: Build a local-first tool that exposes physical storage internals with deterministic metrics and robust parsing.
**Solution**: Implement a deterministic parser with strict validation and explicit corruption reporting; compute explainable metrics; provide visualization and simulation layers; persist snapshots in IndexedDB.
**Trade-offs**: Index/tuple decoding uses simplified heuristics rather than full engine-specific parsing, prioritizing determinism and clarity over engine fidelity.
**When to revisit**: If strict engine-level accuracy is required, replace parsing logic with format-specific decoders and richer tuple schema interpretation.
