# Job Queue System Test Suite

## Quick Start

### Run Tests (repository_after)
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
