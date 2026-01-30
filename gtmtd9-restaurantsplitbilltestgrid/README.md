### Build first
```bash
docker-compose build
```

### Test BEFORE version 
```bash
docker compose run --rm app npm run test:impl
```

### Test AFTER version 
```bash
docker compose run --rm app npm run test:meta
```

### Run full evaluation
```bash
docker compose run --rm app npm run evaluate
```