# BSFO0C - Lunar Cargo Gravity Refactor

## Overview
Refactors rover cargo packing to prioritize center of gravity and lateral balance while preserving max capacity constraints.

## Quick Start

### Run Tests (repository_before)
```bash
docker compose run --rm app-before
```

### Run Tests (repository_after)
```bash
docker compose run --rm app-after
```

### Run Evaluation
```bash
docker compose run --rm evaluation
```

### Run Locally
```bash
REPO=repository_after node --test --test-reporter tap tests/index.js
```

## Generate Patch
```bash
git diff --no-index repository_before/cargoManager.js repository_after/cargoManager.js > patches/diff.patch
```
