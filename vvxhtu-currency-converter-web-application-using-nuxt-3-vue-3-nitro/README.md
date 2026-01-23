# VVXHTU - Currency Converter Web Application (Nuxt 3)

## Overview

A production-grade, high-precision currency converter using Nuxt 3 (Vue 3 + Nitro) with arbitrary-precision decimal math for financial correctness.

- **Task ID:** VVXHTU
- **Title:** Currency Converter Web Application using Nuxt 3
- **Category:** SFT
- **Languages:** TypeScript
- **Frameworks:** Nuxt 3

## Problem Statement

Accurate currency conversion is difficult to implement correctly due to floating-point precision errors, inconsistent exchange-rate sources, varying currency rounding rules, unreliable network conditions, and poor handling of edge cases such as missing rates, stale data, and offline usage.

## Requirements

1. **Currency Selection UI:** Support from/to currencies, swap, favorites, searchable lists, prevent invalid codes
2. **Server-side Rate Fetching:** Nuxt 3 server API (Nitro), caching with TTL, retry/backoff, tamper-resistant response
3. **Arbitrary-Precision Math:** No floating-point, string-based computation, proper rounding per currency (0/2/3 decimals)
4. **Cross-Rate Conversion:** A→B via base currency (EUR), rate locking, divide-by-zero protection

## Folder Structure

```
├── repository_before/     # Empty (code generation task)
├── repository_after/      # Production implementation
│   ├── currencyConverter.ts
│   └── tests/
│       └── currencyConverter.test.ts
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

1. **DecimalMath** - Arbitrary-precision arithmetic using BigInt
2. **CrossRateEngine** - Cross-rate calculation via base currency
3. **RateFetcher** - Server-side rate fetching with caching
4. **CurrencyConverter** - Main converter with proper rounding
5. **CURRENCY_MINOR_UNITS** - ISO-4217 minor unit map (0, 2, 3 decimals)

## Quick Start

### Run Tests
```bash
docker compose run --rm app-after
```

### Run Evaluation
```bash
docker compose run --rm evaluation
```

### Run Locally
```bash
cd repository_after && npm install && npm test
```

## Expected Results

| Repository | Tests | Status |
|------------|-------|--------|
| repository_after | 42/42 | ✅ PASS |

## Test Coverage

- **Requirement 1:** Currency selection, validation, swap, metadata (8 tests)
- **Requirement 2:** Rate fetching, caching, validation (5 tests)
- **Requirement 3:** Arbitrary-precision math, rounding (13 tests)
- **Requirement 4:** Cross-rate conversion, locking (16 tests)

## Key Features

- **Precision:** 0.1 + 0.2 = 0.3 (not 0.30000000000000004)
- **Rounding:** HALF_UP strategy, configurable per-currency
- **Minor Units:** JPY (0), USD (2), KWD (3)
- **Cross-Rates:** USD→GBP via EUR base currency
- **Rate Locking:** Freeze rates for audit trail