# LV4RQJ - Order Processing Pipeline Test Code

**Category:** sft

## Overview
- Task ID: LV4RQJ
- Title: Order Processing Pipeline Test Code
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lv4rqj-order-processing-pipeline-test-code

## Requirements
- Validate input immutability (array and item objects unchanged)
- Verify filtering boundaries minPriority and maxPriority at exact, below, and above limits
- Test randomness deterministically
- Verify artificial delay behavior

## Metadata
- Programming Languages: TypeScript
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.ts`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Install deps: `npm install`
- Run harness tests (meta + before/after): `npm test`
- Run after repo unit tests only: `npm run test:after`
- Run before repo baseline (expected "No tests found"): `npm run test:before`

### Run tests (before – expected some failures)

```bash
docker compose run --rm -e NODE_PATH=/app/repository_before app npm run test:before
```

**Expected behavior:**
- **Unit tests**: ❌ FAIL (expected - no `*.test.ts` files in `repository_before/`)

### Run tests (after – expected all pass)

```bash
docker compose run --rm -e NODE_PATH=/app/repository_after app npm run test:after
```

**Expected behavior:**
- **Unit tests**: ✅ PASS

#### Run evaluation (compares both implementations)

```bash
docker compose run --rm --build app npm run evaluate
```

This will:
- Run tests for both before and after implementations
- Compare results and write a report under `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`
