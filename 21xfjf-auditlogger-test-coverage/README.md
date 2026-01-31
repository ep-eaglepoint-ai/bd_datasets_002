### Build first
```bash
docker-compose build
```

### Test BEFORE version
```bash
docker-compose run --rm after
```

### Test AFTER version 
```bash
docker-compose run --rm meta
```

### Run full evaluation
```bash
docker-compose run --rm evaluate
```