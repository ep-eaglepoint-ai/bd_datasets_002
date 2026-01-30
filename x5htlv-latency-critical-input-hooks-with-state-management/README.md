### Build first
```bash
docker compose build
```

### Test AFTER version 
```bash
docker compose run --rm app python -m pytest -v tests
```

### Run full evaluation
```bash
docker compose run --rm app python evaluation/evaluation.py
```