# Spam Detection Demo - Testing Guide

This project includes Docker-based testing to ensure consistent test execution across environments.



#### 1. repository_before
```bash
docker compose run --rm test sh -c "PYTHONPATH=/app/repository_before pytest repository_after/tests -q
```

#### 2. repository_after
```bash
docker compose run --rm test sh -c "PYTHONPATH=/app/repository_after pytest repository_after/tests -q
```

#### 3. Run Evaluation
```bash
docker compose run --rm test python evaluation/evaluation.py
```


