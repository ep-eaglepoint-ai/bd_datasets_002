# UTKJHD - Pytest tests for a Rate Limiter


# Rate Limiter Testing

## 1. Run Repo After Tests
```bash
 docker compose run --rm app pytest -v -s repository_after/rate_limiter_test.py
```
## 2. Run Meta-Tests
```bash
 docker compose run --rm app pytest -v tests/test_meta.py
```
## 3. Run Full Evaluation Pipeline
```bash
 docker compose run --rm app python evaluation/evaluation.py
```