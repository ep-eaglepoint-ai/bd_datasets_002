# Optimizing Fetch User Activity Summary Performance

### 1. Build the Docker Environment
```bash
docker compose build
```

### 2. Test the Inefficient Implementation (Before Optimization)
```bash
docker compose --profile test run --rm test-before
```


### 3. Test the Optimized Implementation (After Optimization)
```bash
docker compose --profile test run --rm test-after
```


### 4. Run Comprehensive Performance Evaluation
```bash
docker compose --profile eval run --rm evaluation
```
