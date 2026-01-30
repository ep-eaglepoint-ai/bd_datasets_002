# HIVNNF - User Activity Aggregation

## Quick Start

### Run Tests (Before)
```bash
docker compose run --rm app-before
```

### Run Tests (After)
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
