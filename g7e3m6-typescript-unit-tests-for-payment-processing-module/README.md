# G7E3M6 - TypeScript Unit Tests for Payment Processing Modulec


### Run meta tests on `repository_before`

```bash
docker compose run --rm -e REPO_PATH=repository_before app
```

### Run meta tests on `repository_after`

```bash
docker compose run --rm -e REPO_PATH=repository_after app
```

### Run evaluation and generate rports

```bash
docker compose run --rm app node evaluation/evaluation.js
```