# Prisma Expense Splitting – Performance Optimization

### Run tests against `repository_before`

```bash
docker compose run --rm --build test-before
```

### Run tests against `repository_after`

```bash
docker compose run --rm --build test-after
```

### Run evaluation (runs both and generates report)

```bash
docker compose run --rm --build evaluation
```
