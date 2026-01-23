# RK203I - Secure API Calls with PQ Rate Limiting

## Overview

This dataset task involves securing TeleBirr/Safaricom API calls with quantum-resistant rate limiting using a Token Bucket algorithm and Dilithium PQ signatures.

- **Task ID:** RK203I
- **Title:** Secure API Calls with Rate Limiting
- **Category:** Security / Performance
- **Languages:** TypeScript

## Problem Statement

The current `teleBirrCoreCall` in `telebirr_calls.ts` is vulnerable to quantum attacks on hashes and DDoS, lacking PQ-secure rate limiting. This allows quantum adversaries to forge rates and cause outages.

### Issues with `repository_before`:
- No proper rate limiting
- Vulnerable to quantum attacks
- No Token Bucket implementation
- No PQ signatures for rate tokens

## Requirements

1. **Token Bucket:** Refill 100/min, burst 10; deny with 429
2. **Verification:** Test 110 calls/min denies 10

### Constraints

- **Time Complexity:** Strict O(1) non-amortized per call
- **Space Complexity:** O(1) total (fixed scalars only)
- **Determinism:** Identical for sequences (fixed seed PQ)
- **Thread-Safety:** 1000 threads (atomics only)
- **No Libs:** Implement Dilithium PQ sig from scratch
- **Edge Cases:** Quantum sim attacks, 10k/min bursts, zero rate

## Folder Structure

```
├── repository_before/     # Baseline code (no rate limiting)
│   └── telebirr_calls.ts
├── repository_after/      # Optimized code (Token Bucket + PQ)
│   └── telebirr_calls.ts
├── tests/                 # Jest test suite
│   └── telebirr_calls.test.ts
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

1. **TokenBucketRateLimiter** - O(1) token bucket with refill and burst
2. **DilithiumPQSigner** - Quantum-resistant signatures for rate tokens
3. **teleBirrCoreCall** - Rate-limited API calls with 429 on limit exceeded

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
| repository_before | ~5/20 | ❌ FAIL |
| repository_after | 20/20 | ✅ PASS |

## Test Coverage

- **Token Bucket (5 tests):** Burst capacity, allow/deny, tracking, signatures
- **429 Denial (3 tests):** Rate limit response, within limit, rateLimit info
- **110 calls/min (2 tests):** Deny exactly 10/20, deny beyond burst
- **PQ Signatures (5 tests):** Sign, verify, reject invalid, deterministic, different data
- **State Management (3 tests):** Reset, state, remaining tokens

## Generate Patch

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```