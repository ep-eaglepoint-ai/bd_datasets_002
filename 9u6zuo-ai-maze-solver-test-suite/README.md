### Build first
```bash
docker-compose build
```

### Test BEFORE version 
```bash
docker-compose run --rm test-before
```

### Test AFTER version 
```bash
docker-compose run --rm test-after
```

### Run full evaluation
```bash
docker-compose run --rm evaluate
```