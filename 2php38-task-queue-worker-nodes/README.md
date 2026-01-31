# 2PHP38 - Distributed Task Queue Worker Nodes

### Run tests
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after:/app app pytest -v tests/
```

### Run evaluation
```bash
docker compose run --rm app python evaluation/evaluation.py
```
