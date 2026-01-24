# TQIO7C - Refactor and Fix Go Graph Implementation

## Docker Testing and Evaluation Commands

Test repository_before:
```bash
docker-compose run --rm -e REPO=before app go run tests/test_before.go
```

Test the repository_after:
```bash
docker-compose run --rm -e REPO=after app go run tests/test_after.go
```


```bash
# Test before
docker-compose run --rm -e REPO=before app go run tests/test_before.go

# Test after  
docker-compose run --rm -e REPO=after app go run tests/test_after.go

# Run evaluation (runs both tests and generates report)
docker-compose run --rm app go run evaluation/evaluation.go
```
