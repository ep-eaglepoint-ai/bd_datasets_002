# Billing Function Optimization

## Commands

### Test repository_before/

```bash
docker compose run --rm -e REPO_PATH=repository_before billing pytest tests/test_before.py -v
```

### Test repository_after

```bash
docker compose run --rm -e REPO_PATH=repository_after billing pytest tests/test_after.py -v
```

### Generate evaluation report

```bash
docker compose run --rm billing ./run_evaluation.sh
```

Or directly:

```bash
docker compose run --rm billing python evaluation/evaluation.py
```
