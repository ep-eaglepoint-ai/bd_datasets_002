# O36NJP -  Avg Order Function Refactor

## Commands

### 1. Test Repository Before
```bash
docker-compose run --rm -e REPO_PATH=repository_before app
```

### 2. Test Repository After
```bash
docker-compose run --rm -e REPO_PATH=repository_after app
```

### 3. Run Evaluation
```bash
docker-compose run --rm app python evaluation/evaluation.py
```