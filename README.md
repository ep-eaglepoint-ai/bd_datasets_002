# Circuit Breaker State Testing

## Verification Commands

### Test repository_before
```bash
docker compose run --rm -e NODE_PATH=/app/repository_before app
```

### Test repository_after
```bash
docker compose run --rm -e NODE_PATH=/app/repository_after app
```

### Run Evaluation
```bash
docker compose run --rm app node evaluation/evaluation.js
```

## Local PowerShell Verification
