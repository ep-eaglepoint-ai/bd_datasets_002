# Spam Detection Demo

This project implements a production-ready Spam Detection API and UI, supporting real-time training and confidence-based predictions.

### Run tests (before – baseline)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_before app python -m pytest -q tests
```

### Run tests (after – implementation)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app python -m pytest -q tests
```

#### Run evaluation (compares both implementations)
```bash
docker compose run --rm app python evaluation/evaluation.py
```
