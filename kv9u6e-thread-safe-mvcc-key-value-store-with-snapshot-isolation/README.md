# KV9U6E - Thread-Safe MVCC Key-Value Store

## Overview
Pure Python MVCC key-value store with snapshot isolation and write-conflict detection.

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
pytest -q tests
```

## Generate Patch
```bash
git diff --no-index /dev/null repository_after/transactional_kv_store.py > patches/diff.patch
```
