

### Run tests (before – expected some failures)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -q
```
### Run tests (after – expected all pass)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
```

#### Run evaluation (compares both implementations)
```bash
docker compose run --rm app python evaluation/evaluation.py
```
