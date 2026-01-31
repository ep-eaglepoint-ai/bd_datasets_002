# G3ZG38 - poll creation

### Run tests only for repository_after
```bash
docker compose run --rm app npm test
```

### Generate evaluation report
```bash
docker compose run --rm app npx ts-node evaluation/evaluation.ts
```