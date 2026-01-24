# Eliminate GC Thrashing and Excessive Allocations in High-Throughput Telemetry Ingestion Engine

### Run tests on repository_before:

```bash
docker compose run --rm -e REPO_PATH=../repository_before app go test -v ./...
```

### Run tests on repository_after:

```bash
docker compose run --rm -e REPO_PATH=../repository_after app go test -v ./...
```

### Run evaluation and generate report.json:

```bash
docker compose run --rm -w /app/evaluation app go run evaluation.go
```
