# PPRLFA - Go Concurrent Data Aggregator Goroutine Leak Fix


#### 1. Test repository_before (expected to fail due to goroutine leaks)
```bash
docker compose run --rm test_before
```

#### 2. Test repository_after (expected to pass all tests)
```bash
docker compose run --rm test_after
```

#### 3. Run evaluation (compares both implementations and generates report)
```bash
docker compose run --rm evaluation
```
 