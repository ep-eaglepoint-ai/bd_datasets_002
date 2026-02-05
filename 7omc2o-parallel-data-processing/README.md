# Parallel Data Processing Optimization

## Commands

### Test repository_before/

```bash
docker compose run -e REPO_PATH=repository_before test
```

### Test repository_after

```bash
docker compose run -e REPO_PATH=repository_after test
```

### Generate evaluation report

```bash
docker compose run evaluation
```
