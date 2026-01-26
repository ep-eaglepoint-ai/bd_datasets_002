# Build first
```bash
docker-compose build
```

# Test BEFORE version (should show failures because before is buggy):
```bash
docker-compose run --rm repository-before
```

# Test AFTER version (should pass all tests):
```bash
docker-compose run --rm repository-after
```

# Run full evaluation:
```bash
docker-compose run --rm evaluation
```