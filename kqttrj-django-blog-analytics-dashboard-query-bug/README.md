# KQTTRJ - Django Blog Analytics Dashboard Query Bug

## Run Tests (repository_before - expected partial FAIL)
```
docker compose run --rm app-before
```

## Run Tests (repository_after - expected PASS)
```
docker compose run --rm app-after
```

## Run Evaluation
```
docker compose run --rm evaluation
```

## Generate Patch
```
git diff --no-index repository_before/ repository_after/ > patches/diff.patch
```
