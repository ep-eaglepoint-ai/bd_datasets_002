## Commands

### Run the build image
```bash
docker compose build
```

### Run repository_before
```bash
docker compose run --rm app-before npm test
```

### Run repository_after
```bash
docker compose run --rm app-after npm test
```

### Run evaluation
```bash
docker compose run --rm -e RUN_EVALUATION=true app-after
```