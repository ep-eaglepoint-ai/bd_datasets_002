# TO51AD - in memory caching system


## Run tests

```bash
docker compose run --rm -e CACHE_REPO=after tests pytest -v
```

```bash
docker compose run --rm -e CACHE_REPO=before tests pytest -v
```

## Run evaluations

```bash
docker compose run --rm tests python evaluation/evaluation.py
```