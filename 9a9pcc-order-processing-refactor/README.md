# Order Processing Refactor

## Run with Docker

### Build image
```bash
docker compose build
```

### Run tests (before)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -v
```

### Run tests (after)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -v
```

### Run evaluation (compares both implementations)
```bash
docker compose run --rm app python evaluation/evaluation.py
```

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
