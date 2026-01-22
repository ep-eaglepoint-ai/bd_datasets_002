# LRU Cache with TTL Optimization

### Build image
```bash
docker compose build
```

```bash
docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest tests/test_before.py
```

```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest tests/test_after.py
```

```bash
docker compose run --rm app python evaluation/evaluation.py
```