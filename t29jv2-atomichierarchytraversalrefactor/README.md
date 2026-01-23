 ### Run the build image
```bash
docker compose build
```

### Run repository_before test
```bash
docker compose run --rm test-before
```

### Run repository_after test
```bash
docker compose run --rm test-after
```

### Run evaluation
```bash
docker compose run --rm evaluate
```
