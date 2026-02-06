# BSFO0C - Lunar Cargo Gravity Refactor

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

## Generate Patch
```bash
git diff --no-index repository_before/cargoManager.js repository_after/cargoManager.js > patches/diff.patch
```
