# 3TXGYR - Comprehensive Test Suite for EDI Claims Parser

### Run meta tests on repository_before (expected to fail):

```bash
docker compose run --rm -e REPO_PATH=repository_before app
```

### Run meta tests on repository_after (expected to pass):

```bash
docker compose run --rm -e REPO_PATH=repository_after app
```

### Run evaluation and generate dated report.json:

```bash
docker compose run --rm app go run evaluation/evaluation.go
```
