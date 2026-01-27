# LJPTDO - Async Resilient Chunked AI Analysis

## Run Tests (repository_before - expected FAIL)
```bash
docker compose run --rm app-before
```

## Run Tests (repository_after - expected PASS)
```bash
docker compose run --rm app-after
```

## Run Evaluation
```bash
docker compose run --rm evaluation
```

## Generate Patch
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
