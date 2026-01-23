# TJ1L95 - Real-Time Order Book Broadcast Engine

## Overview
High-performance Go engine for real-time Level 2 market depth with snapshot + delta broadcasting.

## Requirements
1. Thread-safe L2 state
2. L2 aggregation logic
3. Snapshot + delta protocol
4. Sequence integrity
5. Adaptive delta merging
6. Backpressure management
7. Convergence for fast/slow clients
8. Concurrency stress
9. Adversarial crossing resilience

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
go test -v ./tests
```

## Generate Patch
```bash
git diff --no-index /dev/null repository_after/orderbook.go > patches/diff.patch
```
