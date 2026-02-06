# WIM9UT - Circuit Breaker Class

## Quick Start

### Run Tests
```bash
docker compose run --rm app-after
```

### Run Evaluation
```bash
docker compose run --rm evaluation
```

### Generate Patch
```bash
git diff --no-index repository_before/ repository_after/ > patches/diff.patch
```