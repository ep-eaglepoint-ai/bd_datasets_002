# Eliminate GC Thrashing and Excessive Allocations in High-Throughput Telemetry Ingestion Engine

### Run tests on repository_before:

```bash
docker compose run --rm app "cd tests && REPO_PATH=../repository_before go test -v ./..."
```

### Run tests on repository_after:

```bash
docker compose run --rm app "cd tests && REPO_PATH=../repository_after go test -v ./..."
```

### Run evaluation and generate report.json:

```bash
docker compose run --rm app "go run evaluation/evaluation.go"
```
