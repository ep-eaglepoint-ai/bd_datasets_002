### Build first
```bash
docker-compose build
```

### Test BEFORE version 
```bash
docker-compose run --rm repository-before
```

### Test AFTER version 
```bash
docker-compose run --rm repository-after
```

### Run full evaluation
```bash
docker-compose run --rm evaluation
```