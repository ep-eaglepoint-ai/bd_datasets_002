# User registration PostgreSQL

## Commands

### Test repository_after

```bash
docker compose run --rm -e REPO_PATH=repository_after registration pytest tests/test_after.py -v
```

### Generate evaluation report

```bash
docker compose run --rm registration python evaluation/evaluation.py
```
