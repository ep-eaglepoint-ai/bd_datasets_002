### Run tests before

```bash
docker compose run --rm -e NODE_PATH=/app/repository_before app npm run test:before
```

### Run tests after

```bash
docker compose run --rm -e NODE_PATH=/app/repository_after app npm run test:after
```

#### Run evaluation

```bash
docker compose run --rm --build app npm run evaluate
```