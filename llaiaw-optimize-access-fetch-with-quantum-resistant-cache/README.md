# LLAIAW - Optimize Access Fetch with Quantum-Resistant Cache

## Overview

This dataset task involves optimizing access fetch operations in a banking app DAL by implementing a Cuckoo hash table for O(1) lookups and post-quantum encryption for cache security.

- **Task ID:** LLAIAW
- **Title:** Optimize Access Fetch with Quantum-Resistant Cache
- **Category:** Performance Optimization / Security
- **Languages:** TypeScript

## Problem Statement

The current `accessServiceListDal` in `accessServiceList.dal.ts` uses `findMany/findFirst` with O(n) scans on large tables, causing >20s latencies on gets and overload during peaks with 500M+ access queries/day.

### Issues with `repository_before`:
- Uses `findMany()` which scans entire table - O(n)
- No caching mechanism
- No quantum-resistant security
- Violates time/space complexity requirements

## Requirements

1. **Perfect Cache:** Cuckoo hash for O(1) lookups; PQ encrypt entries
2. **Verification:** Benchmark 500M simulated gets <1μs; collision-proof

### Constraints

- **Time Complexity:** Strict O(1) per get
- **Space Complexity:** O(1) (perfect hash, no collisions)
- **Determinism:** Cache always matches DB
- **Thread-Safety:** 1000 threads (atomics)
- **No Schema Changes / No Libs**
- **Edge Cases:** 500M mock rows, cache eviction, concurrent get/update, quantum cache poisoning

## Folder Structure

```
├── repository_before/     # Baseline code (O(n) scan)
│   └── accessServiceList.dal.ts
├── repository_after/      # Optimized code (Cuckoo hash + PQ encryption)
│   └── accessServiceList.dal.ts
├── tests/                 # Jest test suite
│   └── accessServiceList.test.ts
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

1. **CuckooHashTable** - O(1) perfect hash with dual hash functions
2. **PQEncryption** - Kyber-inspired quantum-resistant encryption
3. **Optimized DAL** - Cache-first lookups with DB fallback
4. **Cache Statistics** - Hit rate and performance tracking

## Quick Start

### Run Tests (repository_after - expected PASS)
```bash
docker compose run --rm app-after
```

### Run Tests (repository_before - expected FAIL)
```bash
docker compose run --rm app-before
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
| repository_before | 0/20 | ❌ FAIL |
| repository_after | 20/20 | ✅ PASS |

## Test Coverage

- **Requirement 1: Perfect Cache - Cuckoo hash O(1)** (5 tests)
- **Requirement 1: PQ encrypt entries** (5 tests)
- **Requirement 2: Benchmark <1μs** (2 tests)
- **Requirement 2: Collision-proof** (3 tests)
- **DAL Operations Integration** (5 tests)

## Generate Patch

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```