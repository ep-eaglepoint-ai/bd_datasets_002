## Pytest for a csv importer

## Quick start

Copy/paste commands:

```
docker compose run --rm -e REPO_PATH=repository_before app pytest tests/
```

```
docker compose run --rm -e REPO_PATH=repository_after app pytest tests/
```

```
docker compose run --rm app python evaluation/evaluation.py
```

Add dependencies to requirements.txt

