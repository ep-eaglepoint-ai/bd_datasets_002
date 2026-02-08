# Trajectory: Database Storage Explorer – Concrete Change Log

This trajectory records the actual edits made in this workspace, why they were made, and where they live. It is not a retroactive justification; it is a concrete change log tied to files and behaviors.

## Phase 1: Identify Failures Against Requirements
**Guiding Question**: “What concrete issues prevent correctness right now?”

**Findings (with file evidence)**:
1. **Free space math was inverted** causing fill factor/fragmentation metrics to be wrong.  
   File: `repository_after/src/utils/storageParser.ts`
2. **Line pointer decoding inferred tuple lengths from adjacent pointers** (non-deterministic).  
   File: `repository_after/src/utils/storageParser.ts`
3. **Schema validation allowed missing `heapPages`, `indexPages`, `totalPages`**, so invalid JSON could parse.  
   File: `repository_after/src/utils/schemas.ts`
4. **Fragmentation index could divide by zero**, producing `NaN`/`Infinity`.  
   File: `repository_after/src/utils/storageParser.ts`
5. **Binary inspector was not tied to decoded structures**, so it didn’t label offsets.  
   File: `repository_after/src/components/BinaryInspector.tsx`
6. **Simulation and comparison were placeholders**, not deterministic or requirement‑aligned.  
   Files: `repository_after/src/utils/simulateOperation.ts`, `repository_after/src/utils/compareSnapshots.ts`
7. **Corruption handling didn’t capture invalid line pointers or missing index references**.  
   File: `repository_after/src/utils/storageParser.ts`

## Phase 2: Implement Deterministic Parsing + Validation
**Guiding Question**: “What is the minimal set of code changes to make parsing deterministic and metrics explainable?”

**Edits Applied**:
- **Free space correction**: Use `upper - lower` and set `freeSpace.offset` to `lower`.  
  File: `repository_after/src/utils/storageParser.ts`
- **Line pointer decoding (heap + index)**: Decode itemid as `{offset, flags, length}` directly.  
  File: `repository_after/src/utils/storageParser.ts`
- **Line pointer bounds validation**: Reject invalid pointer ranges and record errors.  
  File: `repository_after/src/utils/storageParser.ts`
- **Header validation**: Reject impossible header values (`lower < header size`, `special < upper`).  
  File: `repository_after/src/utils/storageParser.ts`
- **Fragmentation index guard**: Return `0` when max free space is `0`.  
  File: `repository_after/src/utils/storageParser.ts`
- **Schema strictness**: Require `heapPages`, `indexPages`, `totalPages`.  
  File: `repository_after/src/utils/schemas.ts`

**Why**: These are core correctness fixes. Without them, page layouts and metrics are invalid even if UI renders.

## Phase 3: Strengthen Error Reporting
**Guiding Question**: “How do we make corrupted data deterministic and auditable?”

**Edits Applied**:
- **Tuple parse errors now contribute to `parsingErrors` and `corruptedPages`**.  
  File: `repository_after/src/utils/storageParser.ts`
- **Index reference validation**: Missing child pointers are detected and logged.  
  File: `repository_after/src/utils/storageParser.ts`

**Why**: Requirement 19 demands robust handling of corrupted or inconsistent data without silent failure.

## Phase 4: Tie Binary Inspection to Structure
**Guiding Question**: “Can users see which bytes map to decoded fields?”

**Edits Applied**:
- **Structure annotations** for page headers, line pointers, and tuple fields.  
  File: `repository_after/src/components/BinaryInspector.tsx`
- **Tuple raw bytes**: If page raw bytes and tuple offsets exist, display tuple including header bytes; otherwise label as data‑only.  
  File: `repository_after/src/components/BinaryInspector.tsx`

**Why**: Requirement 12 expects structured interpretations, not just hex dumps.

## Phase 5: Make Simulation + Comparison Deterministic
**Guiding Question**: “Do simulations and comparisons produce consistent, explainable results?”

**Edits Applied**:
- **Simulation**: Now chooses a page with sufficient free space, updates `lower/upper`, and repacks pages on vacuum/compact.  
  File: `repository_after/src/utils/simulateOperation.ts`
- **Comparison**: Now produces page‑level added/removed/modified changes with details.  
  File: `repository_after/src/utils/compareSnapshots.ts`

**Why**: Requirements 8 and 13 require deterministic evolution and meaningful comparison.

## Phase 6: Tests Aligned With Validation
**Guiding Question**: “Do tests reflect the stricter parsing and validation rules?”

**Edits Applied**:
- **Invalid JSON test now fails for missing required fields**, matching schema.  
  File: `tests/requirements.test.ts`

**Note**: Tests are still shallow for full requirements; this change only aligns tests with stricter schema.

## Evidence (Concrete Files Touched)
- `repository_after/src/utils/storageParser.ts`
- `repository_after/src/utils/schemas.ts`
- `repository_after/src/components/BinaryInspector.tsx`
- `repository_after/src/utils/simulateOperation.ts`
- `repository_after/src/utils/compareSnapshots.ts`
- `tests/requirements.test.ts`

## Tests Executed
No local test run was executed in this workspace after these edits.

## Remaining Gaps (Explicit)
- Index tuple decoding is still a simplified model (not full PostgreSQL btree tuple parsing).
- Test suite still lacks deep validation for requirements 4, 8, 13–15.
- Repository cleanup of `.next/` and `node_modules` still pending user confirmation.
