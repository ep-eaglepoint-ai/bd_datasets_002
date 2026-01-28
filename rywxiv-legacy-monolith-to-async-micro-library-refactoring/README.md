# RYWXIV - Legacy Monolith to Async Micro-Library Refactoring

# Commands

# Run tests for before repository
```bash
docker compose run app pytest tests --repo before
```

# Run tests for after repository
```bash
docker compose run app pytest tests --repo after
```

# Run evaluation (compares before and after)
```bash
docker compose run app python evaluation/evaluation.py
```
