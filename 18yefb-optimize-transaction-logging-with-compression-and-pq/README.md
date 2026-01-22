# 18YEFB - Optimize Transaction Logging with Compression and PQ

## Overview

This dataset task involves optimizing transaction logging in a telecom top-up controller by implementing inline compression and post-quantum (PQ) cryptographic signing.

- **Task ID:** 18YEFB
- **Title:** Optimize Transaction Logging with Compression and PQ
- **Category:** rl (Refactoring/Logging)
- **Languages:** TypeScript

## Problem Statement

The current `sendLog` function in `telecomTopUP.controller.ts` floods with uncompressed logs, causing quantum-vulnerable audits and overflow at 10k/min. Each log is sent individually without compression or cryptographic protection.

### Issues with `repository_before`:
- No compression - logs are sent raw
- No cryptographic signing - vulnerable to tampering
- No quantum-resistant security
- Violates O(1) time/space complexity requirements

## Requirements

1. **Inline Compress:** Deflate each log with O(1) time complexity
2. **PQ Sign:** Apply Dilithium signature on compressed data
3. **Verification:** Test signature verification; prove compression ratio >50%

### Constraints

- **Time Complexity:** Strict O(1) per log (constant compress/sig; no loops over variable data)
- **Space Complexity:** O(1) per log (fixed buffer; no growing structures)
- **Determinism:** Same compression/signature for identical inputs
- **Thread-Safety:** Support 1000 threads (atomics; no locks)
- **Edge Cases:** Handle 10k/min (no delay), large logs (truncate to 1KB), quantum forge prevention

## Folder Structure

```
├── repository_before/     # Baseline code (faulty logging)
│   └── telecomTopUP.controller.ts
├── repository_after/      # Optimized code (compression + PQ signing)
│   └── telecomTopUP.controller.ts
├── tests/                 # Jest test suite
│   └── telecomTopUP.test.ts
├── evaluation/            # Evaluation scripts
│   └── evaluation.js
├── instances/             # Problem instances
│   └── instance.json
├── patches/               # Diff patches
├── trajectory/            # Development notes
└── docker-compose.yml     # Docker configuration
```

## Solution Implementation

### `repository_after` implements:

1. **InlineCompressor** - Deflate compression with O(1) on fixed 1KB buffer
2. **DilithiumPQSigner** - Post-quantum signature (64-byte deterministic signatures)
3. **SecureLogEntry** - Structured log with compressed data, signature, and compression ratio
4. **verifyLog** - Signature verification function

## Quick Start


### Run Tests (repository_before - expected FAIL)
```bash
docker compose run --rm app-before
```

### Run Tests (repository_after - expected PASS)
```bash
docker compose run --rm app-after
```


### Run Evaluation
```bash
docker compose run --rm evaluation
```

### Run Locally
```bash
# Install dependencies
cd repository_after && npm install

# Run tests
npm test
```

## Expected Results

| Repository | Tests | Status |
|------------|-------|--------|
| repository_before | 0/14 | ❌ FAIL |
| repository_after | 14/14 | ✅ PASS |

## Test Coverage

- Requirement 1: Inline Compress (4 tests)
- Requirement 2: PQ Sign (4 tests)  
- Requirement 3: Verification (6 tests)
- Integration tests (1 test)

## Generate Patch

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
