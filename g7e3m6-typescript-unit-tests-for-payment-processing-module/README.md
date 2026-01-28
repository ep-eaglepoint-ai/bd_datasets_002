# G7E3M6 - TypeScript Unit Tests for Payment Processing Modulec

## Meta tests and evaluation

### Run meta tests on `repository_before` (expected to fail)

```bash
docker compose run --rm -e REPO_PATH=repository_before app
```

### Run meta tests on `repository_after` (expected to pass)

```bash
docker compose run --rm -e REPO_PATH=repository_after app
```

### Run evaluation and generate dated `report.json`

```bash
docker compose run --rm app node evaluation/evaluation.js
```