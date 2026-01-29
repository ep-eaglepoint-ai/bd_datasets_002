# Large File Processor

This project implements a production-ready Large File Processor for Django, supporting streaming uploads, async processing, and content-based validation.

### Run tests (before – baseline)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -q
```

### Run tests (after – implementation)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
```


#### Run evaluation (compares both implementations)
```bash
docker compose run --rm app python evaluation/evaluation.py
```