# SM9BI7 - resilientEmailNotificationService

## Folder Layout
- `repository_before/` — baseline (synchronous) implementation
- `repository_after/` — refactored (queue-based) implementation
- `tests/` — test suite (before.test.ts / index.ts)
- `evaluation/` — evaluation.ts and comparison reports
- `instances/` — sample instances (JSON)
- `patches/` — diff between before/after
- `trajectory/` — notes (Markdown)

## Run with Docker

### Build image
```bash
docker compose build
```

### Run tests (before – expected to fail)
```bash
docker compose --profile test-before run --rm test-before
```

### Run tests (after – expected all pass)
```bash
docker compose --profile test-after run --rm test-after
```

### Run evaluation
```bash
docker compose --profile evaluation run --rm evaluation
```

### Run all (before, after, evaluation)
```bash
docker compose --profile test-before --profile test-after --profile evaluation up --build --abort-on-container-exit
```

## Regenerate Patch
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
 