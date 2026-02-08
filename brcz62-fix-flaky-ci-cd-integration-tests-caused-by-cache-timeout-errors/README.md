# BRCZ62 - Fix Flaky CI/CD Integration Tests Caused by Cache Timeout Errors

## Running Tests

Test repository_before:
```bash
docker-compose run --rm -e REPO=before app; exit 0
```

Test the repository_after:
```bash
docker-compose run --rm -e REPO=after app
```

Run Evaluation:
```bash
docker-compose run --rm app npm run evaluate
```