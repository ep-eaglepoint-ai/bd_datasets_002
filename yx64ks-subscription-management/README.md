# Postgres Subscription Management Function

## Commands

### Test repository_after

```bash
docker compose run --rm --build -e REPO_PATH=repository_after subscription pytest tests/test_subscription.py -v
```

### Generate evaluation report

```bash
docker compose run --rm subscription python evaluation/evaluation.py
```
