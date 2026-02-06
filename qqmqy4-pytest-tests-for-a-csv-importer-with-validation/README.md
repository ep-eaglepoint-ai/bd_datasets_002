## Pytest for a csv importer

## Quick start

Copy/paste commands:

```
docker compose run --rm -e REPO_PATH=repository_before app pytest tests/test_meta_customer_importer.py
```

```
docker compose run --rm -e REPO_PATH=repository_after app pytest tests/test_meta_customer_importer.py
```

```
docker compose run --rm app python evaluation/evaluation.py

The evaluation writes `evaluation/reports/report.json`.
```
