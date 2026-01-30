# UD7D4K - Adversarial, CI-Stable Test Suite for Power Transformer Structural Scaling

### Run pytest against repository_before:
```bash
docker compose run --rm app env REPO_PATH=repository_before python -m pytest tests -v
```

### Run pytest against repository_after:
```bash
docker compose run --rm app env REPO_PATH=repository_after python -m pytest tests -v
```
### Generate evaluation report:
```bash
docker compose run --rm app python evaluation/evaluation.py
```