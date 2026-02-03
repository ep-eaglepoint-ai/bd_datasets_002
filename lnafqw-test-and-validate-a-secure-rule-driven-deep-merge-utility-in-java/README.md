### Build first
```bash
docker-compose build
```

### Test BEFORE version
```bash
docker-compose run --rm test-impl
```

### Test AFTER version 
```bash
docker-compose run --rm test-meta
```

### Run full evaluation
```bash
docker-compose run --rm evaluate
```