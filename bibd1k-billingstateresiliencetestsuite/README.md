# BIBD1K - Billing State Resilience Test Suite

## Overview
Adversarial test suite for a Deno billing state machine handling out-of-order, duplicate, and late events.

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
REPO=repository_after deno test -A tests/billing_service_test.ts
```

## Generate Patch
```bash
git diff --no-index repository_before/billing_service.ts repository_after/billing_service.ts > patches/diff.patch
```
