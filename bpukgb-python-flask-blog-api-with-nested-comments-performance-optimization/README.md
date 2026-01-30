```bash
docker compose run --rm -e TARGET_REPO=repository_before test-runner python -m pytest -q tests
```

```bash
docker compose run --rm -e TARGET_REPO=repository_after test-runner python -m pytest -q tests
```

```bash
docker compose run --rm test-runner python evaluation/evaluation.py
```
