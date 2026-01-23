# 0U26J2 - Discount Resolution Engine

## Overview

A high-precision, non-linear discount engine that evaluates a DAG of promotion rules with inter-dependencies. Implements financial-grade calculations with full audit trail.

- **Task ID:** 0U26J2
- **Title:** DiscountResolutionEngine
- **Category:** SFT
- **Languages:** Go

## Problem Statement

The objective is to architect a high-precision, non-linear discount engine that evaluates a DAG of promotion rules with inter-dependencies. The engine must solve the complexity of rule-pruning, order-dependent stacking, and financial rounding errors while providing a full audit trail for every calculation.

## Requirements

1. **Rule Dependency Resolution:** DAG-based evaluation, circular dependency detection
2. **Financial Precision:** Fixed-point Decimal math, ISO-4217 rounding
3. **Conflict & Pruning Logic:** Exclusive rules terminate branches, Stackable rules with priority
4. **Traceability Metadata:** CalculationManifest with full audit trail
5. **Performance:** Thread-safe, P99 < 5ms for 100 items/200 rules
6. **Idempotent Simulation:** Shadow evaluation with historical snapshots
7. **Unit Testing:** Buy 2 Get 1 + 15% Seasonal interaction
8. **Adversarial Testing:** 500 nodes, 50+ depth nesting
9. **Consistency Testing:** 1000 parallel evaluations with zero variance

## Folder Structure

```
├── repository_before/     # Empty (code generation task)
├── repository_after/      # Go implementation
│   ├── discount_engine.go
│   ├── discount_engine_test.go
│   └── go.mod
├── evaluation/            # Evaluation script
│   └── evaluation.go
├── instances/             # Problem instances
│   └── instance.json
├── patches/               # Diff patches
└── trajectory/            # Development notes
```

## Solution Implementation

### Core Components:

1. **Decimal** - Fixed-point arithmetic (4 decimal places, int64 based)
2. **DAG** - Directed Acyclic Graph for rule dependencies
3. **Rule** - Discount rule with type, mode, priority, dependencies
4. **Engine** - Main evaluation orchestrator
5. **CalculationManifest** - Full audit trail

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
cd repository_after
go test -v ./...
```

## Expected Results

| Tests | Status |
|-------|--------|
| 25/25 | ✅ PASS |

## Key Features

- **No Floating-Point:** All calculations use fixed-point Decimal
- **DAG Evaluation:** Topological sort with cycle detection
- **Exclusive Rules:** Terminate further evaluation branches
- **Stackable Rules:** Additive before Multiplicative ordering
- **Thread-Safe:** Concurrent evaluations supported
- **Audit Trail:** Every price includes CalculationManifest