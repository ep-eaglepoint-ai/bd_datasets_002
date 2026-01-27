# FileStorage Unit Testing

### Run Meta-Tests

Run against repository_before (should FAIL):
```bash
docker compose run --rm -e REPO_PATH=repository_before app
```

Run against repository_after (should PASS):
```bash
docker compose run --rm -e REPO_PATH=repository_after app
```

### Generate Evaluation Report
```bash
docker compose run --rm app python evaluation/evaluation.py
```
