# PostgreSQL E-Commerce Analytics Query Optimization

## Commands

### Test repository_before/

```bash
docker compose run --rm -e REPO_PATH=repository_before ecommerce pytest tests/test_query.py -v
```

### Test repository_after

```bash
docker compose run --rm -e REPO_PATH=repository_after ecommerce pytest tests/test_query.py -v
```

### Generate evaluation report

```bash
docker compose run --rm ecommerce python evaluation/evaluation.py
```
