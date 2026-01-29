# CZSP6L - Unit Tests for Payment Processing Service


## Docker Commands

### Run Tests

Run tests for repository_before 
```bash
docker compose run app pytest tests --repo before
```

Run tests for repository_after
```bash
docker compose run app pytest tests --repo after
```

### Run Evaluation

```bash
docker compose run app python evaluation/evaluation.py
```