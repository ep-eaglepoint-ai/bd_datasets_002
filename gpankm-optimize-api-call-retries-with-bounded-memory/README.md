# Optimize API Call Retries with Bounded Memory

This dataset task contains a Safaricom-style API client with retries. The objective is **bounded logging** (fixed-size history per call), **exponential backoff with jitter**, and **correctness-preserving performance** (1000 calls, 30% failures, <10s).

## Folder layout

- `repository_before/` – original implementation
- `repository_after/` – optimized implementation
- `tests/` – functional + benchmark tests
- `evaluation/` – evaluation script and reports
- `patches/` – diff between before/after

## Run with Docker

### Build image

```bash
docker compose build
```

### Run tests (before – expected some failures)

```bash
docker compose run --rm test-before
```

**Expected behavior:**
- Functional tests: ❌ FAIL (before uses hardcoded `api.example.com`, does not respect `baseUrl` from config)
- Benchmark: may fail

### Run tests (after – expected all pass)

```bash
docker compose run --rm test-after
```

**Expected behavior:**
- Functional tests: ✅ PASS
- Benchmark (1000 calls, 30% failures, <10s): ✅ PASS

### Run evaluation (compares both implementations)

```bash
docker compose run --rm evaluation
```

This will:
- Run tests for both before and after implementations
- Generate a report at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`

## Run locally

### Install dependencies

```bash
npm install
```

### Run tests

```bash
# Default: repository_after
node --expose-gc -r ts-node/register tests/test.ts

# repository_before
REPO_PATH=../repository_before/safaricom_calls node --expose-gc -r ts-node/register tests/test.ts

# repository_after (explicit)
REPO_PATH=../repository_after/safaricom_calls node --expose-gc -r ts-node/register tests/test.ts
```

### Run evaluation

```bash
node --expose-gc -r ts-node/register evaluation/evaluation.ts
```

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
